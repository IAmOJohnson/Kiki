import { sanitize, type Settings } from '@/lib/surprise'

const TOKEN_KEY = 'surprise-admin-token'

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (token: string | null) =>
  token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers)
  if (auth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(`/api${path}`, { ...init, headers })
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new ApiError(503, 'The admin server is not available on this site. Open the admin on a deployment that includes the API.')
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    if (res.status === 401 && auth) setToken(null)
    throw new ApiError(res.status, data.error ?? 'Something went wrong. Please try again.')
  }
  return data as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export interface SurpriseSummary {
  id: string
  title: string
  updatedAt: number
}

export interface SurpriseRecord extends SurpriseSummary {
  settings: Settings
}

export const adminStatus = () => request<{ configured: boolean }>('/admin/status')
export const adminSetup = (password: string) => request<{ token: string }>('/admin/setup', json('POST', { password }))
export const adminLogin = (password: string) => request<{ token: string }>('/admin/login', json('POST', { password }))

export async function fetchPublicSettings(id: string): Promise<Settings> {
  const data = await request<{ settings: unknown }>(`/surprises/${encodeURIComponent(id)}`)
  return sanitize(data.settings)
}

export const listSurprises = () => request<{ surprises: SurpriseSummary[] }>('/surprises', {}, true).then((d) => d.surprises)
export const fetchSurprise = (id: string) => request<SurpriseRecord>(`/surprises/${encodeURIComponent(id)}?full=1`, {}, true)
export const createSurprise = (title: string, settings: Settings) =>
  request<SurpriseRecord>('/surprises', json('POST', { title, settings }), true)
export const updateSurprise = (id: string, title: string, settings: Settings) =>
  request<SurpriseRecord>(`/surprises/${encodeURIComponent(id)}`, json('PUT', { title, settings }), true)
export const deleteSurprise = (id: string) =>
  request<{ ok: true }>(`/surprises/${encodeURIComponent(id)}`, { method: 'DELETE' }, true)

export async function uploadMedia(blob: Blob, ext: string): Promise<string> {
  const data = await request<{ url: string }>(`/media?ext=${ext}`, { method: 'POST', body: blob }, true)
  return data.url
}
