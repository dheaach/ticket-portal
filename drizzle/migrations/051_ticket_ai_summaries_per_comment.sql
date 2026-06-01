-- Per-anchor AI summary (per comment, per description, per ticket header).
-- Run after 050 if needed: psql "$DATABASE_URL" -f drizzle/migrations/051_ticket_ai_summaries_per_comment.sql

DROP TABLE IF EXISTS public.ticket_ai_summaries;

CREATE TABLE public.ticket_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  anchor_type VARCHAR(32) NOT NULL,
  focal_comment_id UUID REFERENCES public.ticket_comments(id) ON DELETE CASCADE,
  summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_to_comment_at TIMESTAMPTZ,
  applied_to_description_at TIMESTAMPTZ,
  applied_to_checklist_at TIMESTAMPTZ,
  CONSTRAINT ticket_ai_summaries_anchor_unique UNIQUE (ticket_id, anchor_type, focal_comment_id)
);

CREATE INDEX IF NOT EXISTS ticket_ai_summaries_ticket_id_idx
  ON public.ticket_ai_summaries (ticket_id);

COMMENT ON TABLE public.ticket_ai_summaries IS 'One saved AI summary per anchor (comment id, description, or ticket header).';
