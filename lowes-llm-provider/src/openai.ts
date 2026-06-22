import { MODEL_ID } from "./config"

export function toOpenAICompletion(content: string, model = MODEL_ID) {
  return {
    id: `chatcmpl_lowecode_${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  }
}

export function toOpenAIChunk(content: string, requestId: string, model = MODEL_ID) {
  const created = Math.floor(Date.now() / 1000)
  return {
    id: requestId,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [
      {
        index: 0,
        delta: { role: "assistant", content },
        finish_reason: null,
      },
    ],
  }
}

export function toOpenAIDoneChunk(requestId: string, model = MODEL_ID) {
  const created = Math.floor(Date.now() / 1000)
  return {
    id: requestId,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  }
}

export function listModels() {
  return {
    object: "list",
    data: [
      {
        id: MODEL_ID,
        object: "model",
        created: 1700000000,
        owned_by: "lowes-mylow",
        permission: [],
        root: MODEL_ID,
        parent: null,
      },
    ],
  }
}

export function errorBody(message: string, code: string, type = "adapter_configuration_error") {
  return {
    error: {
      message,
      type,
      code,
    },
  }
}
