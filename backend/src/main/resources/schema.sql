CREATE TABLE IF NOT EXISTS visitors (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    phone          TEXT    NOT NULL,
    organization   TEXT,
    host_name      TEXT    NOT NULL,
    purpose        TEXT    NOT NULL,
    entry_time     TEXT    NOT NULL,
    status         TEXT    NOT NULL,
    leave_time     TEXT,
    badge_no       TEXT    UNIQUE,
    badge_returned INTEGER NOT NULL DEFAULT 0,
    companion      TEXT,
    note           TEXT,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitors_entry_time ON visitors (entry_time);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors (status);
