const MAX_SIDE = 1280

/** Shrinks a photo to a web-friendly JPEG. This also drops hidden location data (EXIF) before upload. */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process this image.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Could not prepare this image.')
  return blob
}

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'] as const

export function audioExtension(file: File): (typeof AUDIO_EXTENSIONS)[number] | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return AUDIO_EXTENSIONS.find((e) => e === ext) ?? null
}
