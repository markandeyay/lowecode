import type { RetailChatClient } from "./types"
import { MockMylowClient } from "./lowes/mock"
import { MylowClient } from "./lowes/client"
import { MOCK, MAX_POOL_SIZE } from "./config"

const pool: RetailChatClient[] = []

function isMock(): boolean {
  return process.env.LOWECODE_MOCK === "1" || MOCK
}

export async function getClient(): Promise<RetailChatClient> {
  if (pool.length > 0) return pool.pop()!

  const client = isMock() ? new MockMylowClient() : new MylowClient()
  await client.init()
  await client.connect()
  return client
}

export async function releaseClient(client: RetailChatClient): Promise<void> {
  if (pool.length < MAX_POOL_SIZE) {
    pool.push(client)
    return
  }
  await client.close()
}

export async function closeAll(): Promise<void> {
  while (pool.length > 0) {
    const c = pool.pop()!
    await c.close().catch(() => {})
  }
}
