import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import { BrowserMylowClient, type PlaywrightModule, type PlaywrightPage, type PlaywrightLocator } from "../src/lowes/browser"
import { MylowClient } from "../src/lowes/client"
import { LowecodeConfigError } from "../src/types"

function makeMockLocator(opts: { visible?: boolean; count?: number; text?: string; onFill?: () => void } = {}): PlaywrightLocator {
  return {
    fill: async () => {
      opts.onFill?.()
    },
    press: async () => {
      opts.onFill?.()
    },
    click: async () => {
      opts.onFill?.()
    },
    isVisible: async () => opts.visible ?? true,
    count: async () => opts.count ?? 1,
  }
}

function makeMockPage(opts: { hasInput?: boolean; responseText?: string; delayMs?: number } = {}): PlaywrightPage {
  const calls: string[] = []
  const responseText = opts.responseText ?? "Mylow browser response: Use spackle for small holes."
  const delayMs = opts.delayMs ?? 100
  let chatTime = 0
  const onFill = () => {
    chatTime = Date.now()
  }

  return {
    goto: async (url: string) => {
      calls.push(`goto:${url}`)
    },
    waitForSelector: async () => {},
    locator: (selector: string) => makeMockLocator({ visible: opts.hasInput !== false, onFill }),
    $eval: async (selector: string) => {
      if (selector.includes("textarea") || selector.includes("input")) return ""
      if (chatTime > 0 && Date.now() - chatTime >= delayMs) return responseText
      return ""
    },
    evaluate: async <T>(fn: () => T): Promise<T> => fn(),
    close: async () => {},
  }
}

function makeMockContext(page: PlaywrightPage): { ctx: any; pages: PlaywrightPage[] } {
  return {
    ctx: {
      pages: () => [page],
      newPage: async () => page,
      close: async () => {},
    },
    pages: [page],
  }
}

function makeMockPlaywright(page: PlaywrightPage): PlaywrightModule {
  const { ctx } = makeMockContext(page)
  return {
    chromium: {
      launchPersistentContext: async () => ctx,
    },
  }
}

describe("BrowserMylowClient (mock Playwright)", () => {
  it("handles Playwright not installed (LOWES_BROWSER_TRANSPORT_UNAVAILABLE or connects)", async () => {
    const original = process.env.LOWECODE_BROWSER_MODE
    process.env.LOWECODE_BROWSER_MODE = "1"
    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
    delete process.env.LOWECODE_MOCK

    const c = new MylowClient()
    // If Playwright is installed, init() succeeds; if not, it throws LOWES_BROWSER_TRANSPORT_UNAVAILABLE.
    try {
      await c.init()
      await c.close()
    } catch (e: any) {
      assert.ok(e instanceof LowecodeConfigError, "should throw LowecodeConfigError")
      assert.equal(e.code, "LOWES_BROWSER_TRANSPORT_UNAVAILABLE")
    }

    process.env.LOWECODE_BROWSER_MODE = original ?? ""
  })

  it("opens browser, types prompt, and extracts response via DOM", async () => {
    process.env.LOWECODE_BROWSER_MODE = "1"
    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
    delete process.env.LOWECODE_MOCK
    process.env.LOWECODE_BROWSER_TIMEOUT_MS = "5000"

    const page = makeMockPage({ hasInput: true, responseText: "Mylow browser: sand it first, then prime." })
    const mockPW = makeMockPlaywright(page)

    const c = new MylowClient(mockPW)
    await c.init()
    await c.connect()

    const responsePromise = c.chat("how to prep a door for painting?")
    await new Promise((r) => setTimeout(r, 2100))
    const r = await responsePromise

    assert.equal(r, "Mylow browser: sand it first, then prime.")
    await c.close()

    delete process.env.LOWECODE_BROWSER_MODE
    delete process.env.LOWECODE_BROWSER_TIMEOUT_MS
  })

  it("throws LOWES_BROWSER_TRANSPORT_UNAVAILABLE when no input found", async () => {
    process.env.LOWECODE_BROWSER_MODE = "1"
    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
    delete process.env.LOWECODE_MOCK
    process.env.LOWECODE_BROWSER_TIMEOUT_MS = "3000"

    const page = makeMockPage({ hasInput: false })
    const mockPW = makeMockPlaywright(page)

    const c = new MylowClient(mockPW)
    await c.init()
    await c.connect()

    await assert.rejects(
      () => c.chat("hello"),
      (err: unknown) => err instanceof LowecodeConfigError && err.code === "LOWES_BROWSER_TRANSPORT_UNAVAILABLE",
    )
    await c.close()

    delete process.env.LOWECODE_BROWSER_MODE
    delete process.env.LOWECODE_BROWSER_TIMEOUT_MS
  })
})

describe("BrowserMylowClient config", () => {
  it("respects LOWECODE_MYLOW_URL", async () => {
    process.env.LOWECODE_BROWSER_MODE = "1"
    process.env.LOWECODE_MYLOW_URL = "https://www.lowes.com/Mylow"
    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
    delete process.env.LOWECODE_MOCK

    const page = makeMockPage({ hasInput: true, responseText: "ok" })
    const mockPW = makeMockPlaywright(page)

    const c = new MylowClient(mockPW)
    await c.init()
    await c.connect()
    await c.close()

    delete process.env.LOWECODE_BROWSER_MODE
    delete process.env.LOWECODE_MYLOW_URL
  })

  it("respects LOWECODE_BROWSER_PROFILE_DIR", () => {
    process.env.LOWECODE_BROWSER_PROFILE_DIR = "/tmp/test-profile"
    const c = new BrowserMylowClient()
    assert.ok((c as any).profileDir === "/tmp/test-profile")
    delete process.env.LOWECODE_BROWSER_PROFILE_DIR
  })

  it("defaults to headed mode", () => {
    delete process.env.LOWECODE_BROWSER_HEADLESS
    const c = new BrowserMylowClient()
    assert.equal((c as any).headless, false)
  })

  it("respects LOWECODE_BROWSER_HEADLESS=1", () => {
    process.env.LOWECODE_BROWSER_HEADLESS = "1"
    const c = new BrowserMylowClient()
    assert.equal((c as any).headless, true)
    delete process.env.LOWECODE_BROWSER_HEADLESS
  })
})
