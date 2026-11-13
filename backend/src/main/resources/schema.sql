CREATE TABLE IF NOT EXISTS visitors (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    phone          TEXT    NOT NULL,
    company        TEXT    NOT NULL,
    host_name      TEXT    NOT NULL,
    purpose        TEXT    NOT NULL,
    entry_time     TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'PENDING',
    leave_time     TEXT,
    badge_returned INTEGER,
    approved_at    TEXT,
    reject_reason  TEXT,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors (status);
CREATE INDEX IF NOT EXISTS idx_visitors_entry_time ON visitors (entry_time);
