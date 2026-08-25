-- Concurrent ticket saves hit this unique index and return 500.
DROP INDEX IF EXISTS tickets_support_company_priority_unique;
