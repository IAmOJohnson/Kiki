import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleApi } from './handler'
import type { Store } from './store'

const MAX_BODY = 8 * 1024 * 1024

/** Runs the web-standard API handler inside a Node http server (the dev server and `bun run start`). */
export async function serveApi(store: Store, req: IncomingMessage & { originalUrl?: string }, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost')
    const method = req.method ?? 'GET'
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of req) {
      size += (chunk as Buffer).length
      if (size > MAX_BODY) {
        res.statusCode = 413
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'That file is too large.' }))
        return
      }
      chunks.push(chunk as Buffer)
    }
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value)
    }
    if (!headers.has('x-forwarded-for') && req.socket.remoteAddress) headers.set('x-forwarded-for', req.socket.remoteAddress)
    const hasBody = method !== 'GET' && method !== 'HEAD' && chunks.length > 0
    const request = new Request(url, { method, headers, body: hasBody ? (new Uint8Array(Buffer.concat(chunks)) as unknown as BodyInit) : undefined })
    const response = await handleApi(request, store)
    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error('[api]', error)
    res.statusCode = 500
    res.end('Server error')
  }
}
