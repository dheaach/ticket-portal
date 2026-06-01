import { and, eq, isNull } from 'drizzle-orm'

import { db, ticketAiSummaries } from '@/lib/db'
import {
  summarizeAnchorType,
  summarizeFocalCommentId,
} from '@/lib/ticket-ai-summary-anchor'
import type { SummarizeAnchorRequest } from '@/lib/ticket-comment-summarize'

export {
  parseSummarizeAnchorFromSearchParams,
  summarizeAnchorSearchParams,
} from '@/lib/ticket-ai-summary-anchor'

export type TicketAiSummaryRow = typeof ticketAiSummaries.$inferSelect

function anchorWhere(ticketId: number, anchor: SummarizeAnchorRequest) {
  const anchorType = summarizeAnchorType(anchor)
  const focalCommentId = summarizeFocalCommentId(anchor)
  if (focalCommentId) {
    return and(
      eq(ticketAiSummaries.ticketId, ticketId),
      eq(ticketAiSummaries.anchorType, anchorType),
      eq(ticketAiSummaries.focalCommentId, focalCommentId)
    )
  }
  return and(
    eq(ticketAiSummaries.ticketId, ticketId),
    eq(ticketAiSummaries.anchorType, anchorType),
    isNull(ticketAiSummaries.focalCommentId)
  )
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((s) => s.length > 0)
}

export function ticketAiSummaryToJson(row: TicketAiSummaryRow) {
  const summary = normalizeStringArray(row.summary)
  const checklist = normalizeStringArray(row.checklist)
  return {
    summary,
    checklist,
    items: summary,
    cached: true as const,
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    anchor_type: row.anchorType,
    focal_comment_id: row.focalCommentId,
    applied_to_comment: Boolean(row.appliedToCommentAt),
    applied_to_description: Boolean(row.appliedToDescriptionAt),
    applied_to_checklist: Boolean(row.appliedToChecklistAt),
  }
}

export async function getTicketAiSummary(
  ticketId: number,
  anchor: SummarizeAnchorRequest
): Promise<TicketAiSummaryRow | null> {
  const [row] = await db
    .select()
    .from(ticketAiSummaries)
    .where(anchorWhere(ticketId, anchor))
    .limit(1)
  return row ?? null
}

export async function saveTicketAiSummary(params: {
  ticketId: number
  anchor: SummarizeAnchorRequest
  summary: string[]
  checklist: string[]
  createdByUserId: string
}): Promise<TicketAiSummaryRow> {
  const [row] = await db
    .insert(ticketAiSummaries)
    .values({
      ticketId: params.ticketId,
      anchorType: summarizeAnchorType(params.anchor),
      focalCommentId: summarizeFocalCommentId(params.anchor),
      summary: params.summary,
      checklist: params.checklist,
      createdByUserId: params.createdByUserId,
    })
    .returning()
  return row
}

export type TicketAiSummaryApplyTarget = 'comment' | 'description' | 'checklist'

export async function markTicketAiSummaryApplied(
  ticketId: number,
  anchor: SummarizeAnchorRequest,
  target: TicketAiSummaryApplyTarget
): Promise<void> {
  const now = new Date()
  const patch =
    target === 'comment'
      ? { appliedToCommentAt: now }
      : target === 'description'
        ? { appliedToDescriptionAt: now }
        : { appliedToChecklistAt: now }
  await db.update(ticketAiSummaries).set(patch).where(anchorWhere(ticketId, anchor))
}
