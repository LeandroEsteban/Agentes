ALTER TABLE oirs_cases ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_oirs_cases_deleted_at ON oirs_cases(deleted_at);

ALTER TABLE citizen_requests ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_citizen_requests_deleted_at ON citizen_requests(deleted_at);
