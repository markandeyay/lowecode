import { LowecodeConfigError } from "../types"
import { liveEndpoint, detectTransport, browserMode, type Transport } from "../config"

export type LowesSession = {
  id: string
  createdAt: number
  expiresAt?: number
  metadata?: Record<string, string>
  endpoint: string
  transport: Transport
}

export class LowesSessionManager {
  private session: LowesSession | null = null

  async create(): Promise<LowesSession> {
    const browser = browserMode()
    const endpoint = liveEndpoint()

    if (!browser && !endpoint) {
      throw new LowecodeConfigError(
        "LOWES_ENDPOINT_NOT_CONFIGURED",
        "Live Lowe's Mylow routing is not configured. Set LOWECODE_MOCK=1 for tests, LOWECODE_BROWSER_MODE=1 for browser mode, or LOWES_MYLOW_LIVE_ENDPOINT for an authorized endpoint.",
      )
    }

    const transport: Transport = browser ? "browser" : detectTransport(endpoint)
    const id = `lowes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.session = {
      id,
      createdAt: Date.now(),
      endpoint: browser ? "" : endpoint,
      transport,
    }
    return this.session
  }

  get(): LowesSession | null {
    return this.session
  }

  async refresh(): Promise<void> {
    this.session = null
    await this.create()
  }

  clear(): void {
    this.session = null
  }
}
