import { LowecodeConfigError, type RetailChatClient } from "../types"
import { browserProfileDir, mylowUrl, browserHeadless, browserTimeoutMs, DEBUG_TRANSCRIPTS } from "../config"
import { capPrompt } from "./transform"

export type PlaywrightModule = {
  chromium: {
    launchPersistentContext: (
      userDataDir: string,
      opts: Record<string, unknown>,
    ) => Promise<PlaywrightContext>
  }
}

export type PlaywrightPage = {
  goto(url: string, opts?: Record<string, unknown>): Promise<unknown>
  waitForSelector(selector: string, opts?: Record<string, unknown>): Promise<unknown>
  locator(selector: string): PlaywrightLocator
  $eval(selector: string, fn: (el: unknown) => string): Promise<string>
  evaluate<T>(fn: () => T): Promise<T>
  close(): Promise<void>
}

export type PlaywrightLocator = {
  fill(text: string): Promise<unknown>
  press(key: string): Promise<unknown>
  click(): Promise<unknown>
  isVisible(): Promise<boolean>
  count(): Promise<number>
}

export type PlaywrightContext = {
  pages(): PlaywrightPage[]
  newPage(): Promise<PlaywrightPage>
  close(): Promise<void>
}

async function loadPlaywright(): Promise<PlaywrightModule> {
  try {
    const mod = (await import("playwright")) as unknown as PlaywrightModule
    return mod
  } catch {
    throw new LowecodeConfigError(
      "LOWES_BROWSER_TRANSPORT_UNAVAILABLE",
      "Playwright is not installed. Run `npm install playwright` in lowes-llm-provider and `npx playwright install chromium`.",
    )
  }
}

const INPUT_SELECTORS = [
  'textarea[placeholder*="ask" i]',
  'textarea[placeholder*="mylow" i]',
  'textarea[placeholder*="chat" i]',
  'textarea[placeholder*="question" i]',
  'textarea[placeholder*="help" i]',
  'textarea',
  'input[type="text"][placeholder*="ask" i]',
  'input[type="text"][placeholder*="chat" i]',
  'input[type="text"]',
]

const RESPONSE_SELECTORS = [
  '[data-testid*="mylow" i] [data-testid*="message" i]',
  '[data-testid*="mylow" i] [data-testid*="response" i]',
  '[class*="mylow" i] [class*="response" i]',
  '[class*="mylow" i] [class*="message" i]',
  '[class*="chat" i] [class*="assistant" i]',
  '[class*="chat" i] [class*="response" i]',
  '[class*="conversation" i] [class*="assistant" i]',
  '[role="log"]',
  '[aria-live="polite"]',
  '[class*="message"][class*="bot" i]',
  '[class*="message"][class*="ai" i]',
]

async function findInput(page: PlaywrightPage): Promise<PlaywrightLocator | null> {
  for (const sel of INPUT_SELECTORS) {
    try {
      const loc = page.locator(sel)
      if ((await loc.count()) > 0 && (await loc.isVisible())) return loc
    } catch {
      // continue to next selector
    }
  }
  return null
}

async function findResponse(page: PlaywrightPage): Promise<string | null> {
  for (const sel of RESPONSE_SELECTORS) {
    try {
      const text = await page.$eval(sel, (el: any) => el.textContent || "").catch(() => "")
      if (text && text.trim().length > 0) return text.trim()
    } catch {
      // continue
    }
  }
  return null
}

export class BrowserMylowClient implements RetailChatClient {
  private mod: PlaywrightModule | null = null
  private ctx: PlaywrightContext | null = null
  private page: PlaywrightPage | null = null
  private readonly url: string
  private readonly profileDir: string
  private readonly headless: boolean
  private readonly timeout: number

  constructor(playwright?: PlaywrightModule) {
    this.url = mylowUrl()
    this.profileDir = browserProfileDir()
    this.headless = browserHeadless()
    this.timeout = browserTimeoutMs()
    if (playwright) this.mod = playwright
  }

  async init(): Promise<void> {
    if (!this.mod) this.mod = await loadPlaywright()
  }

  async connect(): Promise<void> {
    if (!this.mod) throw new LowecodeConfigError("LOWES_BROWSER_TRANSPORT_UNAVAILABLE", "init() not called")

    if (this.ctx) return

    if (DEBUG_TRANSCRIPTS) {
      console.log(`[LOWECODE] browser: launching ${this.headless ? "headless" : "headed"} at ${this.url}`)
    }

    this.ctx = await this.mod.chromium.launchPersistentContext(this.profileDir, {
      headless: this.headless,
      viewport: { width: 1280, height: 900 },
      args: ["--disable-blink-features=AutomationControlled"],
    })

    const pages = this.ctx.pages()
    this.page = pages.length > 0 ? pages[0] : await this.ctx.newPage()

    await this.page.goto(this.url, { waitUntil: "domcontentloaded", timeout: this.timeout })

    if (DEBUG_TRANSCRIPTS) {
      console.log("[LOWECODE] browser: page loaded, waiting for user to complete any verification/login")
    }
  }

  async chat(prompt: string): Promise<string> {
    if (!this.page) {
      throw new LowecodeConfigError("LOWES_BROWSER_TRANSPORT_UNAVAILABLE", "Browser not connected. Call connect() first.")
    }

    const capped = capPrompt(prompt)
    if (DEBUG_TRANSCRIPTS) {
      console.log("[LOWECODE] browser: looking for chat input for prompt:", capped.slice(0, 120))
    }

    const input = await findInput(this.page)
    if (!input) {
      throw new LowecodeConfigError(
        "LOWES_BROWSER_TRANSPORT_UNAVAILABLE",
        "Could not find a Mylow chat input field on the page. The page may require manual login, the Mylow widget may not be loaded, or Lowe's may be blocking automation. Complete any verification in the browser window and retry.",
      )
    }

    const prevResponse = (await findResponse(this.page)) || ""

    await input.fill(capped)
    await input.press("Enter").catch(async () => {
      // fallback: try a send button
      const sendSelectors = [
        'button[type="submit"]',
        'button[aria-label*="send" i]',
        'button[class*="send" i]',
        'button[data-testid*="send" i]',
      ]
      for (const sel of sendSelectors) {
        try {
          const btn = this.page!.locator(sel)
          if ((await btn.count()) > 0 && (await btn.isVisible())) {
            await btn.click()
            return
          }
        } catch {
          // continue
        }
      }
    })

    if (DEBUG_TRANSCRIPTS) {
      console.log("[LOWECODE] browser: prompt sent, waiting for response...")
    }

    const deadline = Date.now() + this.timeout
    let text: string | null = null
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000))
      text = await findResponse(this.page)
      if (text && text !== prevResponse && text.length > prevResponse.length) {
        if (DEBUG_TRANSCRIPTS) {
          console.log("[LOWECODE] browser: got response:", text.slice(0, 120))
        }
        return text
      }
    }

    throw new LowecodeConfigError(
      "LOWES_BROWSER_TRANSPORT_UNAVAILABLE",
      "Timed out waiting for a Mylow response in the browser. The widget may be slow, blocked, or the response selectors may not match. See LOWECODE_DEBUG_TRANSCRIPTS=1 for details.",
    )
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {})
      this.page = null
    }
    if (this.ctx) {
      await this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}
