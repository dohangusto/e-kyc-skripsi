ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS distribution_id TEXT REFERENCES distributions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_distribution ON notifications(distribution_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_distribution
    ON notifications(user_id, distribution_id)
    WHERE distribution_id IS NOT NULL;
