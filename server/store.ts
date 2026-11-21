/** Where surprises, uploads and admin data live. Files on a normal server, Netlify Blobs on Netlify. */
export type Namespace = 'surprises' | 'media' | 'meta'

export interface Store {
  get(ns: Namespace, key: string): Promise<Uint8Array | null>
  put(ns: Namespace, key: string, data: Uint8Array): Promise<void>
  del(ns: Namespace, key: string): Promise<void>
  list(ns: Namespace): Promise<string[]>
}
