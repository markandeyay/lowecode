export const PORT = Number(process.env.LOWECODE_ADAPTER_PORT || 3000)
export const MOCK = process.env.LOWECODE_MOCK === "1"
export const BASE_URL = process.env.LOWES_MYLOW_BASE_URL || `http://localhost:${PORT}/v1`
export const LOG_LEVEL = process.env.LOWECODE_LOG_LEVEL || "info"
export const DEBUG_TRANSCRIPTS = process.env.LOWECODE_DEBUG_TRANSCRIPTS === "1"
export const MAX_POOL_SIZE = Number(process.env.MAX_POOL_SIZE || 5)
export const MODEL_ID = "mylow-1"
export const PROVIDER_ID = "lowes-mylow"

export function liveEndpoint(): string {
  return process.env.LOWES_MYLOW_LIVE_ENDPOINT || ""
}

export function apiKey(): string {
  return process.env.LOWES_MYLOW_API_KEY || "lowecode-local"
}

export function browserMode(): boolean {
  return process.env.LOWECODE_BROWSER_MODE === "1"
}

export function browserProfileDir(): string {
  return process.env.LOWECODE_BROWSER_PROFILE_DIR || ".lowecode-browser-profile"
}

export function mylowUrl(): string {
  return process.env.LOWECODE_MYLOW_URL || "https://www.lowes.com/l/about/ai-at-lowes"
}

export function browserHeadless(): boolean {
  return process.env.LOWECODE_BROWSER_HEADLESS === "1"
}

export function browserTimeoutMs(): number {
  return Number(process.env.LOWECODE_BROWSER_TIMEOUT_MS || 60000)
}

export type Transport = "external-openai" | "rest" | "browser"

export function detectTransport(endpoint: string): Transport {
  const e = endpoint.toLowerCase()
  if (e.endsWith("/v1") || e.includes("/v1/chat/completions") || e.includes("/chat/completions")) {
    return "external-openai"
  }
  return "rest"
}
