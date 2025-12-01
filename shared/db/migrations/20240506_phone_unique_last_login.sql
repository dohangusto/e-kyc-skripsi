-- Add last_login timestamp for auditability.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Clean up duplicate phone numbers by keeping the most recently updated row.
WITH normalized AS (
    SELECT id,
           regexp_replace(phone, '\\D', '', 'g') AS norm_phone,
           row_number() OVER (
               PARTITION BY regexp_replace(phone, '\\D', '', 'g')
               ORDER BY updated_at DESC, created_at DESC
           ) AS rn
    FROM users
    WHERE phone IS NOT NULL AND phone <> ''
)
UPDATE users u
SET phone = NULL
FROM normalized n
WHERE u.id = n.id AND n.rn > 1;

-- Enforce unique normalized phone numbers (digits only), ignoring null/empty.
DROP INDEX IF EXISTS users_phone_normalized_idx;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_normalized_idx
    ON users (regexp_replace(phone, '\\D', '', 'g'))
    WHERE phone IS NOT NULL AND phone <> '';
