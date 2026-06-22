export type ChatRole = "system" | "user" | "assistant"

export type ChatMessage = {
  role: ChatRole
  content: string
}

export interface RetailChatClient {
  init(): Promise<void>
  connect(): Promise<void>
  chat(prompt: string): Promise<string>
  close(): Promise<void>
}

export class LowecodeConfigError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "LowecodeConfigError"
    this.code = code
  }
}
