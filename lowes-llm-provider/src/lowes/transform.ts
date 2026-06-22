import type { ChatMessage } from "../types"

export function transformMessages(messages: ChatMessage[]): string {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n")
  const user = messages.filter((m) => m.role === "user")
  const last = user[user.length - 1]

  const parts: string[] = []
  if (system) parts.push(system)
  if (last) parts.push(last.content)

  return parts.join("\n\n")
}

const MAX_PROMPT = 8000

export function capPrompt(prompt: string, max = MAX_PROMPT): string {
  if (prompt.length <= max) return prompt
  return prompt.slice(0, max) + "\n\n[LOWECODE: prompt truncated to fit Mylow context limit]"
}
