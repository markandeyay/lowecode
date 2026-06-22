import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { MockMylowClient } from "../src/lowes/mock"
import { MylowClient } from "../src/lowes/client"
import { LowecodeConfigError } from "../src/types"
import { detectTransport } from "../src/config"

function startServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(handler)
    server.listen(0, () => resolve(server))
  })
}

function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()))
}

function portOf(server: http.Server): number {
  return (server.address() as any).port
}

describe("MockMylowClient", () => {
  it("returns deterministic response without network", async () => {
    const c = new MockMylowClient()
    await c.init()
    await c.connect()
    const r = await c.chat("hello")
    assert.ok(r.includes("LOWECODE mock Mylow response."))
    assert.ok(r.includes("hello"))
    await c.close()
  })
})

describe("MylowClient (live fail-closed)", () => {
  it("init throws LOWES_ENDPOINT_NOT_CONFIGURED when no live endpoint", async () => {
    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
    delete process.env.LOWECODE_MOCK
    const c = new MylowClient()
    await assert.rejects(
      () => c.init(),
      (err: unknown) => err instanceof LowecodeConfigError && err.code === "LOWES_ENDPOINT_NOT_CONFIGURED",
    )
  })

  it("chat throws LOWES_ENDPOINT_NOT_CONFIGURED when no live endpoint", async () => {
    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
    delete process.env.LOWECODE_MOCK
    const c = new MylowClient()
    await assert.rejects(
      () => c.chat("hello"),
      (err: unknown) => err instanceof LowecodeConfigError && err.code === "LOWES_ENDPOINT_NOT_CONFIGURED",
    )
  })
})

describe("detectTransport", () => {
  it("detects external-openai for /v1 endpoints", () => {
    assert.equal(detectTransport("https://mylow.lowes.com/v1"), "external-openai")
  })

  it("detects external-openai for /chat/completions endpoints", () => {
    assert.equal(detectTransport("https://mylow.lowes.com/v1/chat/completions"), "external-openai")
  })

  it("detects rest for other endpoints", () => {
    assert.equal(detectTransport("https://mylow.lowes.com/api/chat"), "rest")
  })
})

describe("MylowClient (external-openai transport via mock server)", () => {
  let server: http.Server
  let port: number
  let lastBody: any

  before(async () => {
    server = await startServer((req, res) => {
      let data = ""
      req.on("data", (chunk) => (data += chunk))
      req.on("end", () => {
        try {
          lastBody = JSON.parse(data)
        } catch {
          lastBody = data
        }
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(
          JSON.stringify({
            choices: [{ message: { role: "assistant", content: "Mylow says: use a #2 Phillips head screwdriver." } }],
          }),
        )
      })
    })
    port = portOf(server)
  })

  after(async () => {
    await stopServer(server)
  })

  it("routes chat through an authorized OpenAI-compatible endpoint", async () => {
    process.env.LOWES_MYLOW_LIVE_ENDPOINT = `http://localhost:${port}/v1`
    delete process.env.LOWECODE_MOCK

    const c = new MylowClient()
    await c.init()
    await c.connect()
    const r = await c.chat("what screwdriver for drywall?")
    assert.equal(r, "Mylow says: use a #2 Phillips head screwdriver.")
    assert.equal(lastBody.model, "mylow-1")
    assert.equal(lastBody.messages[0].role, "user")
    assert.ok(lastBody.messages[0].content.includes("what screwdriver"))
    await c.close()

    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
  })

  it("fails with LOWES_ENDPOINT_ERROR when authorized endpoint returns error", async () => {
    const errServer = await startServer((_req, res) => {
      res.writeHead(503, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "unavailable" }))
    })
    const errPort = portOf(errServer)

    process.env.LOWES_MYLOW_LIVE_ENDPOINT = `http://localhost:${errPort}/v1`
    delete process.env.LOWECODE_MOCK

    const c = new MylowClient()
    await c.init()
    await assert.rejects(
      () => c.chat("hello"),
      (err: unknown) => err instanceof LowecodeConfigError && err.code === "LOWES_ENDPOINT_ERROR",
    )
    await c.close()

    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
    await stopServer(errServer)
  })
})

describe("MylowClient (rest transport via mock server)", () => {
  let server: http.Server
  let port: number

  before(async () => {
    server = await startServer((req, res) => {
      let data = ""
      req.on("data", (chunk) => (data += chunk))
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ response: "Mylow REST: sand the surface first, then apply primer." }))
      })
    })
    port = portOf(server)
  })

  after(async () => {
    await stopServer(server)
  })

  it("routes chat through an authorized REST endpoint", async () => {
    process.env.LOWES_MYLOW_LIVE_ENDPOINT = `http://localhost:${port}/api/mylow`
    delete process.env.LOWECODE_MOCK

    const c = new MylowClient()
    await c.init()
    await c.connect()
    const r = await c.chat("how to paint a door?")
    assert.equal(r, "Mylow REST: sand the surface first, then apply primer.")
    await c.close()

    delete process.env.LOWES_MYLOW_LIVE_ENDPOINT
  })
})
