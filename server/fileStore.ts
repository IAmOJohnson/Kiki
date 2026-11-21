import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import type { Namespace, Store } from './store'

const KEY_RE = /^[A-Za-z0-9._-]+$/

export function createFileStore(dataDir = process.env.DATA_DIR ?? 'data'): Store {
  const root = path.resolve(dataDir)
  // Admin files sit at the top of the data folder; everything else gets its own folder.
  const dirFor = (ns: Namespace) => (ns === 'meta' ? root : path.join(root, ns))
  const fileFor = (ns: Namespace, key: string) => {
    if (!KEY_RE.test(key) || key.includes('..')) throw new Error('Invalid storage key')
    return path.join(dirFor(ns), key)
  }

  return {
    async get(ns, key) {
      try {
        return new Uint8Array(await readFile(fileFor(ns, key)))
      } catch {
        return null
      }
    },
    async put(ns, key, data) {
      await mkdir(dirFor(ns), { recursive: true })
      const file = fileFor(ns, key)
      const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`
      await writeFile(tmp, data, { mode: 0o600 })
      await rename(tmp, file)
    },
    async del(ns, key) {
      await unlink(fileFor(ns, key)).catch(() => undefined)
    },
    async list(ns) {
      try {
        return (await readdir(dirFor(ns))).filter((f) => !f.endsWith('.tmp'))
      } catch {
        return []
      }
    },
  }
}
