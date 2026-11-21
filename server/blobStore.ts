import { getStore } from '@netlify/blobs'
import type { Namespace, Store } from './store'

const open = (ns: Namespace) => getStore({ name: `surprise-${ns}`, consistency: 'strong' })

/** Netlify Blobs storage for the Netlify function. Data survives deploys. */
export const blobStore: Store = {
  async get(ns, key) {
    const data = await open(ns).get(key, { type: 'arrayBuffer' })
    return data ? new Uint8Array(data) : null
  },
  async put(ns, key, data) {
    const copy = new ArrayBuffer(data.byteLength)
    new Uint8Array(copy).set(data)
    await open(ns).set(key, copy)
  },
  async del(ns, key) {
    await open(ns).delete(key)
  },
  async list(ns) {
    const { blobs } = await open(ns).list()
    return blobs.map((b) => b.key)
  },
}
