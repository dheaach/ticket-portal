-- Add received_at to ticket_comments: always NOW() on insert, never back-dated.
-- Used for the unread-dot comparison instead of created_at (which email imports back-date to email send time).
ALTER TABLE ticket_comments
  ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now();
