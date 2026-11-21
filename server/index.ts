// Production server: serves the built app from dist/ and the same API the dev server mounts.
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { createFileStore } from './fileStore'
import { serveApi } from './node'

const store = createFileStore()
const DIST = path.resolve('dist')
const PORT = Number(process.env.PORT ?? 3000)
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

async function fileFor(urlPath: string): Promise<string> {
  const candidate = path.join(DIST, path.normalize(decodeURIComponent(urlPath)))
  if (!candidate.startsWith(DIST)) return path.join(DIST, 'index.html')
  try {
    if ((await stat(candidate)).isFile()) return candidate
  } catch {
    // fall through to the single-page app entry
  }
  return path.join(DIST, 'index.html')
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname.startsWith('/api/')) {
    void serveApi(store, req, res)
    return
  }
  void fileFor(url.pathname).then((file) => {
    res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream')
    createReadStream(file).pipe(res)
  })
}).listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`))
