/**
 * lowes-llm-provider — LOWECODE adapter
 *
 * OpenAI-compatible HTTP API backed by Lowe's Mylow chatbot.
 * Endpoints:
 *   GET  /health
 *   GET  /v1/models
 *   POST /v1/chat/completions   (streaming + non-streaming)
 */

import express, { type Request, type Response } from "express"
import { getClient, releaseClient, closeAll } from "./pool"
import { transformMessages, capPrompt } from "./lowes/transform"
import { toOpenAICompletion, toOpenAIChunk, toOpenAIDoneChunk, listModels, errorBody } from "./openai"
import { PORT, MOCK, MODEL_ID } from "./config"
import type { ChatMessage } from "./types"
import { LowecodeConfigError } from "./types"

const app = express()
app.use(express.json({ limit: "2mb" }))

interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "lowecode-lowes-provider", mock: MOCK })
})

app.get("/v1/models", (_req: Request, res: Response) => {
  res.json(listModels())
})

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  const body = req.body as ChatCompletionRequest
  const messages = body?.messages
  const stream = body?.stream === true

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json(errorBody("No messages provided.", "invalid_request_error", "invalid_request_error"))
    return
  }

  const prompt = capPrompt(transformMessages(messages))
  const requestId = `chatcmpl_lowecode_${Date.now()}`

  let client = null
  try {
    client = await getClient()
    const text = await client.chat(prompt)
    await releaseClient(client)
    client = null

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")
      res.write(`data: ${JSON.stringify(toOpenAIChunk(text, requestId))}\n\n`)
      res.write(`data: ${JSON.stringify(toOpenAIDoneChunk(requestId))}\n\n`)
      res.write("data: [DONE]\n\n")
      res.end()
    } else {
      res.json(toOpenAICompletion(text, MODEL_ID))
    }
  } catch (err) {
    if (client) await client.close().catch(() => {})

    if (err instanceof LowecodeConfigError) {
      res.status(503).json(errorBody(err.message, err.code))
      return
    }

    const message = err instanceof Error ? err.message : String(err)
    console.error("LOWECODE adapter error:", message)
    const status = message.includes("401") || message.includes("Unauthorized")
      ? 401
      : message.includes("429") || message.includes("Rate")
        ? 429
        : 500
    res.status(status).json(errorBody(message, "adapter_error", "server_error"))
  }
})

app.listen(PORT, () => {
  const mode = MOCK ? "MOCK MODE (test-only)" : "LIVE MODE"
  console.log(`LOWECODE adapter listening on :${PORT} — ${mode}`)
  console.log(`LOWECODE provider: lowes-mylow`)
  console.log(`LOWECODE model: ${MODEL_ID}`)
  if (MOCK) console.log("LOWECODE MOCK MODE: test-only adapter responses will be used.")
})

process.on("SIGTERM", async () => {
  await closeAll()
  process.exit(0)
})

export default app
