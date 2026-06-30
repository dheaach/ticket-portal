/**
 * Pure public-URL builder for the active storage provider. Deliberately has
 * zero Node-builtin / SDK imports so it is safe to bundle into client code
 * (unlike lib/storage-local.ts which touches `fs/promises`).
 */

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function getIdrivePublicUrl(path: string): string {
  const encodedPath = path.replace(/#/g, '%23')
  const bucket = process.env.IDRIVE_E2_BUCKET || 'dtlabs'
  const endpoint = process.env.IDRIVE_E2_ENDPOINT
  const publicBase =
    process.env.IDRIVE_E2_PUBLIC_URL ||
    (endpoint ? `https://${bucket}.${endpoint.replace(/^https?:\/\//, '')}` : null)

  if (publicBase) {
    return `${normalizeBaseUrl(publicBase)}/${encodedPath}`
  }
  if (endpoint) {
    const host = endpoint.replace(/^https?:\/\//, '')
    return `https://${bucket}.${host}/${encodedPath}`
  }
  return `/${encodedPath}`
}

function getLocalPublicUrl(path: string): string {
  const base = (process.env.STORAGE_LOCAL_PUBLIC_URL || '/api/storage/file').replace(/\/+$/, '')
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${base}/${encodedPath}`
}

export function getPublicUrl(path: string): string {
  const provider = (process.env.STORAGE_PROVIDER || 'idrive').trim().toLowerCase()
  return provider === 'local' ? getLocalPublicUrl(path) : getIdrivePublicUrl(path)
}
