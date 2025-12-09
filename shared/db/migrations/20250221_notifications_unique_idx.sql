-- Ensure upsert support for notifications keyed by user + distribution.
-- This unique index still allows multiple NULL distribution_id rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_distribution
    ON notifications(user_id, distribution_id);
