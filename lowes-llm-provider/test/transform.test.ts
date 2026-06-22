import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { transformMessages, capPrompt } from "../src/lowes/transform"
import type { ChatMessage } from "../src/types"

describe("transform", () => {
  it("joins system + last user message", () => {
    const msgs: ChatMessage[] = [
      { role: "system", content: "You are a coding assistant." },
      { role: "user", content: "first question" },
      { role: "assistant", content: "answer" },
      { role: "user", content: "second question" },
    ]
    const p = transformMessages(msgs)
    assert.ok(p.startsWith("You are a coding assistant."))
    assert.ok(p.endsWith("second question"))
  })

  it("handles user-only messages", () => {
    const p = transformMessages([{ role: "user", content: "hello" }])
    assert.equal(p, "hello")
  })

  it("concatenates multiple system messages", () => {
    const p = transformMessages([
      { role: "system", content: "rule 1" },
      { role: "system", content: "rule 2" },
      { role: "user", content: "go" },
    ])
    assert.ok(p.includes("rule 1"))
    assert.ok(p.includes("rule 2"))
    assert.ok(p.endsWith("go"))
  })

  it("capPrompt truncates long input", () => {
    const long = "x".repeat(10000)
    const capped = capPrompt(long, 100)
    assert.ok(capped.length < long.length)
    assert.ok(capped.includes("truncated"))
  })

  it("capPrompt leaves short input unchanged", () => {
    assert.equal(capPrompt("short", 100), "short")
  })
})
