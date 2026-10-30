import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import * as idrive from '@/lib/storage-idrive'
import * as local from '@/lib/storage-local'

/**
 * GET /api/attachments/download?url=<file url>&name=<file name>
 * Serves a stored attachment from our own storage.
 * Images and PDFs are shown inline; other types are downloaded.
 *
 * Resolves by URL shape (local `/api/storage/file/...` vs iDrive public URL),
 * not by STORAGE_PROVIDER — draft/local files must still open when the
 * active provider is iDrive, and vice versa.
 */

const INLINE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'])

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
}

function decodeKeySegments(rest: string): string | null {
  if (!rest) return null
  let key: string
  try {
    key = rest
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/')
  } catch {
    return null
  }
  if (!key || key.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')) {
    return null
  }
  return key
}

function localPublicPrefix(): string {
  return (process.env.STORAGE_LOCAL_PUBLIC_URL || '/api/storage/file').replace(/\/+$/, '')
}

/** Local object key when `target` is a same-origin local storage URL. */
function localKeyFromUrl(target: URL, reqOrigin: string): string | null {
  if (target.origin !== reqOrigin) return null
  const prefix = localPublicPrefix()
  if (!target.pathname.startsWith(`${prefix}/`)) return null
  return decodeKeySegments(target.pathname.slice(prefix.length).replace(/^\/+/, ''))
}

/** iDrive object key when `target` is on our configured public/endpoint host. */
function idriveKeyFromUrl(target: URL, reqOrigin: string): string | null {
  let probe: URL
  try {
    probe = new URL(idrive.getPublicUrl('probe'), reqOrigin)
  } catch {
    return null
  }
  if (target.origin !== probe.origin) return null

  const prefix = probe.pathname.slice(0, -'probe'.length).replace(/\/$/, '')
  let rest = target.pathname
  if (prefix) {
    if (!rest.startsWith(`${prefix}/`)) return null
    rest = rest.slice(prefix.length + 1)
  } else {
    rest = rest.replace(/^\/+/, '')
  }
  // Public base may include the bucket as a path segment (…/dtlabs/key).
  return decodeKeySegments(rest)
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reqUrl = new URL(request.url)
  const raw = reqUrl.searchParams.get('url')?.trim()
  if (!raw) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  let target: URL
  try {
    target = new URL(raw, reqUrl.origin)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const localKey = localKeyFromUrl(target, reqUrl.origin)
  const idriveKey = localKey ? null : idriveKeyFromUrl(target, reqUrl.origin)
  if (!localKey && !idriveKey) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 400 })
  }

  const key = (localKey || idriveKey)!
  const result = localKey
    ? await local.getObjectBuffer(localKey)
    : await idrive.getObjectBuffer(idriveKey!)

  if ('error' in result || !result.buffer?.length) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const ext = key.split('.').pop()?.toLowerCase() || ''
  const storedType =
    result.contentType && result.contentType !== 'application/octet-stream' ? result.contentType : ''
  const contentType = storedType || CONTENT_TYPES[ext] || 'application/octet-stream'
  const disposition = INLINE_EXT.has(ext) ? 'inline' : 'attachment'
  const fallback = key.split('/').pop() || 'download'
  const name = (reqUrl.searchParams.get('name')?.trim() || fallback).replace(/[\r\n"/]/g, '_')
  const asciiName = name.replace(/[^\x20-\x7e]/g, '_')

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(result.buffer.length),
      'Content-Disposition': `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
