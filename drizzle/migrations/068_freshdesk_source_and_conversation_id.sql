-- Freshdesk import/resync support (from dt-labs).
-- Do not run drizzle/0003_add_fd_conversation_id_to_ticket_comments.sql — it also
-- CREATE TABLEs that already exist. Use this file instead.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS freshdesk_id bigint;

COMMENT ON COLUMN companies.freshdesk_id IS 'Freshdesk company ID for per-company resync. Null if never imported/matched.';

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS source varchar(32);

COMMENT ON COLUMN tickets.source IS 'Origin of the ticket: freshdesk for imported tickets, null for natively created ones.';

ALTER TABLE ticket_comments
  ADD COLUMN IF NOT EXISTS fd_conversation_id bigint;

COMMENT ON COLUMN ticket_comments.fd_conversation_id IS 'Freshdesk conversation ID for dedup on re-import/resync. Null for native comments.';

-- Unique so re-import/resync can ON CONFLICT DO NOTHING. Multiple NULLs are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS ticket_comments_fd_conversation_id_unique
  ON ticket_comments (fd_conversation_id);
