import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { DEFAULTS, sanitize, type Settings } from '../src/lib/surprise'
import type { Store } from './store'

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const ID_RE = /^[a-z0-9]{10}$/
const MEDIA_RE = /^[0-9a-f-]{36}\.(jpg|png|webp|mp3|wav|ogg|m4a)$/
const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
}
const IMAGE_EXT = new Set(['jpg', 'png', 'webp'])
const IMAGE_LIMIT = 4 * 1024 * 1024
/** Serverless hosts cap request bodies at about 6 MB, so songs stay under that. */
export const AUDIO_LIMIT = 5 * 1024 * 1024
const MAX_SURPRISES = 500

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

interface SurpriseRecord {
  id: string
  title: string
  settings: Settings
  createdAt: number
  updatedAt: number
}

interface AdminFile {
  salt: string
  hash: string
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

const decoder = new TextDecoder()
const encoder = new TextEncoder()

async function readJsonFile<T>(store: Store, ns: 'surprises' | 'meta', key: string): Promise<T | null> {
  const bytes = await store.get(ns, key)
  if (!bytes) return null
  try {
    return JSON.parse(decoder.decode(bytes)) as T
  } catch {
    return null
  }
}

const writeJsonFile = (store: Store, ns: 'surprises' | 'meta', key: string, value: unknown) =>
  store.put(ns, key, encoder.encode(JSON.stringify(value)))

async function readBody(req: Request, limit: number): Promise<Uint8Array> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > limit) throw new HttpError(413, 'That file is too large.')
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length > limit) throw new HttpError(413, 'That file is too large.')
  return bytes
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const raw = await readBody(req, 64 * 1024)
  try {
    const parsed: unknown = JSON.parse(decoder.decode(raw) || '{}')
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    // fall through
  }
  throw new HttpError(400, 'Invalid request.')
}

// ---------- auth ----------

async function getSecret(store: Store): Promise<Uint8Array> {
  const existing = await store.get('meta', 'secret.key')
  if (existing) return existing
  const secret = new Uint8Array(randomBytes(32))
  await store.put('meta', 'secret.key', secret)
  return secret
}

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 64).toString('hex')

async function issueToken(store: Store): Promise<string> {
  const exp = String(Date.now() + TOKEN_TTL_MS)
  return `${exp}.${createHmac('sha256', await getSecret(store)).update(exp).digest('hex')}`
}

async function requireAdmin(store: Store, req: Request) {
  const header = req.headers.get('authorization') ?? ''
  const [exp, sig] = (header.startsWith('Bearer ') ? header.slice(7) : '').split('.')
  if (exp && sig && Number(exp) > Date.now()) {
    const expected = createHmac('sha256', await getSecret(store)).update(exp).digest('hex')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length === b.length && timingSafeEqual(a, b)) return
  }
  throw new HttpError(401, 'Please sign in again.')
}

// Per-instance guard against password guessing. On serverless hosts each instance keeps its own count.
const attempts = new Map<string, { count: number; reset: number }>()
function throttle(req: Request) {
  const key = req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 10 * 60 * 1000 })
    return
  }
  entry.count += 1
  if (entry.count > 10) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.')
}

function checkPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 200) {
    throw new HttpError(400, 'Use a password of at least 8 characters.')
  }
  return value
}

// ---------- surprises ----------

function newId(): string {
  return Array.from(randomBytes(10), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')
}

function cleanTitle(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 60) || 'Untitled surprise' : 'Untitled surprise'
}

async function listRecords(store: Store): Promise<SurpriseRecord[]> {
  const keys = (await store.list('surprises')).filter((k) => k.endsWith('.json'))
  const records = await Promise.all(keys.map((k) => readJsonFile<SurpriseRecord>(store, 'surprises', k)))
  return records.filter((r): r is SurpriseRecord => r !== null).sort((a, b) => b.updatedAt - a.updatedAt)
}

async function getRecord(store: Store, id: string): Promise<SurpriseRecord> {
  if (!ID_RE.test(id)) throw new HttpError(404, 'Surprise not found.')
  const record = await readJsonFile<SurpriseRecord>(store, 'surprises', `${id}.json`)
  if (!record) throw new HttpError(404, 'Surprise not found.')
  return record
}

// ---------- media ----------

function magicOk(ext: string, b: Uint8Array): boolean {
  const ascii = (from: number, to: number) => Buffer.from(b.subarray(from, to)).toString('latin1')
  switch (ext) {
    case 'jpg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    case 'png':
      return ascii(1, 4) === 'PNG'
    case 'webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    case 'wav':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    case 'ogg':
      return ascii(0, 4) === 'OggS'
    case 'm4a':
      return ascii(4, 8) === 'ftyp'
    case 'mp3':
      return ascii(0, 3) === 'ID3' || (b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0)
    default:
      return false
  }
}

async function serveMedia(store: Store, req: Request, file: string): Promise<Response> {
  const match = MEDIA_RE.exec(file)
  const bytes = match ? await store.get('media', file) : null
  if (!match || !bytes) throw new HttpError(404, 'Not found.')
  const size = bytes.length
  const headers: Record<string, string> = {
    'Content-Type': MEDIA_TYPES[match[1]],
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')
  if (range && (range[1] || range[2])) {
    let start = 0
    let end = size - 1
    if (range[1]) {
      start = Number(range[1])
      if (range[2]) end = Math.min(Number(range[2]), size - 1)
    } else {
      start = Math.max(size - Number(range[2]), 0)
    }
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    const slice = bytes.subarray(start, end + 1)
    return new Response(slice as unknown as BodyInit, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(slice.length) },
    })
  }
  return new Response(bytes as unknown as BodyInit, { status: 200, headers: { ...headers, 'Content-Length': String(size) } })
}

// ---------- router ----------

async function route(store: Store, req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/(\.netlify\/functions\/api|api)(?=\/|$)/, '')
  const parts = path.split('/').filter(Boolean)
  const method = req.method
  const [area, id] = parts

  if (area === 'admin') {
    if (parts[1] === 'status' && method === 'GET') {
      return json(200, { configured: (await readJsonFile<AdminFile>(store, 'meta', 'admin.json')) !== null })
    }
    if (parts[1] === 'setup' && method === 'POST') {
      throttle(req)
      if (await readJsonFile<AdminFile>(store, 'meta', 'admin.json')) throw new HttpError(409, 'An admin password is already set.')
      const password = checkPassword((await readJson(req)).password)
      const salt = randomBytes(16).toString('hex')
      await writeJsonFile(store, 'meta', 'admin.json', { salt, hash: hashPassword(password, salt) } satisfies AdminFile)
      return json(200, { token: await issueToken(store) })
    }
    if (parts[1] === 'login' && method === 'POST') {
      throttle(req)
      const admin = await readJsonFile<AdminFile>(store, 'meta', 'admin.json')
      if (!admin) throw new HttpError(409, 'Set an admin password first.')
      const password = String((await readJson(req)).password ?? '')
      const a = Buffer.from(hashPassword(password, admin.salt), 'hex')
      const b = Buffer.from(admin.hash, 'hex')
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'That password is not right.')
      return json(200, { token: await issueToken(store) })
    }
    throw new HttpError(404, 'Not found.')
  }

  if (area === 'media') {
    if (method === 'GET' && id) return serveMedia(store, req, id)
    if (method === 'POST' && !id) {
      await requireAdmin(store, req)
      const ext = url.searchParams.get('ext') ?? ''
      if (!(ext in MEDIA_TYPES)) throw new HttpError(400, 'Unsupported file type.')
      const body = await readBody(req, IMAGE_EXT.has(ext) ? IMAGE_LIMIT : AUDIO_LIMIT)
      if (!magicOk(ext, body)) throw new HttpError(400, `That file does not look like a valid .${ext} file.`)
      const name = `${randomUUID()}.${ext}`
      await store.put('media', name, body)
      return json(201, { url: `/api/media/${name}` })
    }
    throw new HttpError(404, 'Not found.')
  }

  if (area === 'surprises') {
    if (method === 'GET' && id) {
      const record = await getRecord(store, id)
      if (url.searchParams.get('full') === '1') {
        await requireAdmin(store, req)
        return json(200, record)
      }
      return json(200, { settings: sanitize(record.settings), updatedAt: record.updatedAt })
    }
    await requireAdmin(store, req)
    if (method === 'GET' && !id) {
      const records = await listRecords(store)
      return json(200, { surprises: records.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt })) })
    }
    if (method === 'POST' && !id) {
      if ((await listRecords(store)).length >= MAX_SURPRISES) throw new HttpError(409, 'Surprise limit reached.')
      const body = await readJson(req)
      const now = Date.now()
      const record: SurpriseRecord = {
        id: newId(),
        title: cleanTitle(body.title),
        settings: sanitize(body.settings ?? DEFAULTS),
        createdAt: now,
        updatedAt: now,
      }
      await writeJsonFile(store, 'surprises', `${record.id}.json`, record)
      return json(201, record)
    }
    if (id && method === 'PUT') {
      const existing = await getRecord(store, id)
      const body = await readJson(req)
      const record: SurpriseRecord = { ...existing, title: cleanTitle(body.title), settings: sanitize(body.settings), updatedAt: Date.now() }
      await writeJsonFile(store, 'surprises', `${id}.json`, record)
      return json(200, record)
    }
    if (id && method === 'DELETE') {
      await getRecord(store, id)
      await store.del('surprises', `${id}.json`)
      return json(200, { ok: true })
    }
  }

  throw new HttpError(404, 'Not found.')
}

export async function handleApi(req: Request, store: Store): Promise<Response> {
  try {
    return await route(store, req)
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message })
    console.error('[api]', error)
    return json(500, { error: 'Something went wrong on the server.' })
  }
}
