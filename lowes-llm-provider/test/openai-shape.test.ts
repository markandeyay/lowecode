import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { toOpenAICompletion, toOpenAIDoneChunk, toOpenAIChunk, listModels, errorBody } from "../src/openai"

describe("OpenAI response shape", () => {
  it("toOpenAICompletion produces a valid chat.completion object", () => {
    const r = toOpenAICompletion("hello world", "mylow-1")
    assert.equal(r.object, "chat.completion")
    assert.equal(r.model, "mylow-1")
    assert.equal(r.choices[0].message.role, "assistant")
    assert.equal(r.choices[0].message.content, "hello world")
    assert.equal(r.choices[0].finish_reason, "stop")
    assert.ok(r.id.startsWith("chatcmpl_lowecode_"))
    assert.equal(typeof r.created, "number")
    assert.deepEqual(r.usage, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 })
  })

  it("toOpenAIChunk produces chat.completion.chunk", () => {
    const c = toOpenAIChunk("hi", "req-1")
    assert.equal(c.object, "chat.completion.chunk")
    assert.equal(c.id, "req-1")
    assert.equal(c.choices[0].delta.content, "hi")
    assert.equal(c.choices[0].finish_reason, null)
  })

  it("toOpenAIDoneChunk sets finish_reason stop", () => {
    const c = toOpenAIDoneChunk("req-1")
    assert.equal(c.choices[0].finish_reason, "stop")
  })

  it("listModels includes mylow-1", () => {
    const m = listModels()
    assert.equal(m.object, "list")
    assert.ok(m.data.some((d: { id: string }) => d.id === "mylow-1"))
  })

  it("errorBody carries LOWES_ENDPOINT_NOT_CONFIGURED code", () => {
    const e = errorBody("no endpoint", "LOWES_ENDPOINT_NOT_CONFIGURED")
    assert.equal(e.error.code, "LOWES_ENDPOINT_NOT_CONFIGURED")
    assert.equal(e.error.type, "adapter_configuration_error")
  })
})
