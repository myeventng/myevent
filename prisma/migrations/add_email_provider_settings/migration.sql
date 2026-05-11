-- prisma/migrations/YYYYMMDDHHMMSS_add_email_provider_settings/migration.sql
-- No schema change needed — PlatformSettings uses a key/value model (key: String, value: Json).
-- This migration seeds the default email provider keys so they exist on first deploy.

INSERT INTO "PlatformSettings" ("id", "key", "value", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'email.activeProvider',      '"gmail"',        NOW(), NOW()),
  (gen_random_uuid(), 'email.fromName',             '"MyEvent.com.ng"', NOW(), NOW()),
  (gen_random_uuid(), 'email.gmail.host',           '"smtp.gmail.com"', NOW(), NOW()),
  (gen_random_uuid(), 'email.gmail.port',           '465',             NOW(), NOW()),
  (gen_random_uuid(), 'email.gmail.secure',         'true',            NOW(), NOW()),
  (gen_random_uuid(), 'email.gmail.user',           '""',              NOW(), NOW()),
  (gen_random_uuid(), 'email.gmail.password',       '""',              NOW(), NOW()),
  (gen_random_uuid(), 'email.ses.region',           '"us-east-1"',     NOW(), NOW()),
  (gen_random_uuid(), 'email.ses.fromAddress',      '""',              NOW(), NOW()),
  (gen_random_uuid(), 'email.ses.accessKeyId',      '""',              NOW(), NOW()),
  (gen_random_uuid(), 'email.ses.secretAccessKey',  '""',              NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
