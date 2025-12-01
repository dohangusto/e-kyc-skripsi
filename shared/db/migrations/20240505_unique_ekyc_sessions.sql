-- Ensure each user has only one eKYC session record.
-- Safe re-run: deletes older duplicates before adding the unique constraint.
WITH ranked AS (
    SELECT id,
           user_id,
           row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) AS rn
    FROM ekyc_sessions
    WHERE user_id IS NOT NULL
)
DELETE FROM ekyc_sessions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE ekyc_sessions
    ADD CONSTRAINT ekyc_sessions_user_id_key UNIQUE (user_id);
