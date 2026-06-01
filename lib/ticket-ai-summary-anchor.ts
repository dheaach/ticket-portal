/**
 * Client-safe helpers for AI summarize anchors (no DB / Node imports).
 */

import type { SummarizeAnchorRequest } from '@/lib/ticket-comment-summarize'

export function summarizeAnchorType(anchor: SummarizeAnchorRequest): string {
  if (anchor.type === 'comment') return 'comment'
  if (anchor.type === 'ticket') return 'ticket'
  return 'description'
}

export function summarizeFocalCommentId(anchor: SummarizeAnchorRequest): string | null {
  return anchor.type === 'comment' ? anchor.commentId : null
}

/** Query string for GET summarize (same anchor as POST body). */
export function summarizeAnchorSearchParams(anchor: SummarizeAnchorRequest): string {
  if (anchor.type === 'comment') {
    return `anchor=comment&commentId=${encodeURIComponent(anchor.commentId)}`
  }
  return `anchor=${anchor.type === 'ticket' ? 'ticket' : 'description'}`
}

export function parseSummarizeAnchorFromSearchParams(
  searchParams: URLSearchParams
): SummarizeAnchorRequest | null {
  const raw = searchParams.get('anchor')
  if (raw === 'comment') {
    const commentId = searchParams.get('commentId')?.trim()
    if (!commentId) return null
    return { type: 'comment', commentId }
  }
  if (raw === 'ticket') return { type: 'ticket' }
  if (raw === 'description') return { type: 'description' }
  return null
}
