import type { RetailChatClient } from "../types"

export class MockMylowClient implements RetailChatClient {
  async init(): Promise<void> {}
  async connect(): Promise<void> {}

  async chat(prompt: string): Promise<string> {
    return [
      "LOWECODE mock Mylow response.",
      "",
      "Live Lowe's routing is not enabled.",
      "",
      "Prompt:",
      prompt.slice(0, 500),
    ].join("\n")
  }

  async close(): Promise<void> {}
}
