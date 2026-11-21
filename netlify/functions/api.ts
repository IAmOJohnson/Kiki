import { handleApi } from '../../server/handler'
import { blobStore } from '../../server/blobStore'

// Netlify runs this for every /api/* request. Data is kept in Netlify Blobs.
export default (req: Request) => handleApi(req, blobStore)

export const config = { path: '/api/*' }
