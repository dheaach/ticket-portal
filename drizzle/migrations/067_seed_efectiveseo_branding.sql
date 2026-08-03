-- Persist EfectiveSEO app branding (name, logo, favicon, email sender).
-- Safe to re-run: upserts existing keys.

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('app_name', 'EfectiveSEO', NOW()),
  (
    'app_logo_url',
    'https://efectiveseo.com/wp-content/uploads/2025/05/effectiveseo-logo-white-scaled.png',
    NOW()
  ),
  (
    'app_favicon_url',
    'https://efectiveseo.com/wp-content/uploads/2025/05/efectiveseo_Logo-Mark-White-text-dark-bg.png',
    NOW()
  ),
  ('email_sender_name', 'EfectiveSEO Support', NOW())
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  updated_at = NOW();
