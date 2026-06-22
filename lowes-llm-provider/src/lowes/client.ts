import { LowecodeConfigError, type RetailChatClient } from "../types"
import { liveEndpoint, apiKey, DEBUG_TRANSCRIPTS, MODEL_ID, browserMode } from "../config"
import { LowesSessionManager, type LowesSession } from "./session"
import { transformMessages, capPrompt } from "./transform"
import { BrowserMylowClient, type PlaywrightModule } from "./browser"

async function postJSON(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

async function externalOpenAIChat(session: LowesSession, prompt: string): Promise<string> {
  const base = session.endpoint.endsWith("/chat/completions")
    ? session.endpoint
    : `${session.endpoint.replace(/\/$/, "")}/chat/completions`
  const key = apiKey()
  const res = await postJSON(
    base,
    {
      model: MODEL_ID,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    },
    key ? { Authorization: `Bearer ${key}` } : {},
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new LowecodeConfigError(
      "LOWES_ENDPOINT_ERROR",
      `Authorized Mylow endpoint returned ${res.status}: ${text.slice(0, 200)}`,
    )
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new LowecodeConfigError("LOWES_ENDPOINT_ERROR", "Authorized Mylow endpoint returned no content.")
  }
  return content
}

async function restChat(session: LowesSession, prompt: string): Promise<string> {
  const res = await postJSON(session.endpoint, { prompt })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new LowecodeConfigError(
      "LOWES_ENDPOINT_ERROR",
      `Authorized Mylow REST endpoint returned ${res.status}: ${text.slice(0, 200)}`,
    )
  }

  const data = (await res.json()) as { response?: string; text?: string; content?: string; message?: string }
  const content = data.response ?? data.text ?? data.content ?? data.message
  if (!content) {
    throw new LowecodeConfigError("LOWES_ENDPOINT_ERROR", "Authorized Mylow REST endpoint returned no content.")
  }
  return content
}

export class MylowClient implements RetailChatClient {
  private sessions = new LowesSessionManager()
  private browser: BrowserMylowClient | null = null

  constructor(playwright?: PlaywrightModule) {
    if (playwright) this.browser = new BrowserMylowClient(playwright)
  }

  async init(): Promise<void> {
    const browser = browserMode()
    const endpoint = liveEndpoint()

    if (!browser && !endpoint) {
      throw new LowecodeConfigError(
        "LOWES_ENDPOINT_NOT_CONFIGURED",
        "Live Lowe's Mylow routing is not configured. Set LOWECODE_MOCK=1 for tests, LOWECODE_BROWSER_MODE=1 for browser mode, or LOWES_MYLOW_LIVE_ENDPOINT for an authorized endpoint.",
      )
    }

    await this.sessions.create()

    if (browser) {
      if (!this.browser) this.browser = new BrowserMylowClient()
      await this.browser.init()
    }
  }

  async connect(): Promise<void> {
    const browser = browserMode()
    const endpoint = liveEndpoint()

    if (!browser && !endpoint) {
      throw new LowecodeConfigError(
        "LOWES_ENDPOINT_NOT_CONFIGURED",
        "Live Lowe's Mylow routing is not configured. Set LOWECODE_MOCK=1 for tests, LOWECODE_BROWSER_MODE=1 for browser mode, or LOWES_MYLOW_LIVE_ENDPOINT for an authorized endpoint.",
      )
    }

    if (browser && this.browser) {
      await this.browser.connect()
    }
  }

  async chat(prompt: string): Promise<string> {
    const session = this.sessions.get()
    if (!session) {
      throw new LowecodeConfigError("LOWES_ENDPOINT_NOT_CONFIGURED", "Mylow session not initialized.")
    }

    const capped = capPrompt(prompt)
    if (DEBUG_TRANSCRIPTS) {
      console.log("[LOWECODE] sending prompt to Mylow via", session.transport, ":", capped.slice(0, 200))
    }

    if (session.transport === "browser") {
      if (!this.browser) {
        throw new LowecodeConfigError("LOWES_BROWSER_TRANSPORT_UNAVAILABLE", "Browser client not initialized.")
      }
      return this.browser.chat(capped)
    }

    if (session.transport === "external-openai") {
      return externalOpenAIChat(session, capped)
    }
    return restChat(session, capped)
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {})
    }
    this.sessions.clear()
  }
}

export { transformMessages }
