CREATE TABLE oirs_cases (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'web',
    subject VARCHAR(300) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    citizen_account_id BIGINT NULL,
    anonymous_name VARCHAR(200),
    anonymous_email VARCHAR(254),
    anonymous_phone VARCHAR(40),
    contact_consent BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_department_id BIGINT NULL,
    assigned_user_id BIGINT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_oirs_cases_uuid ON oirs_cases(uuid);
CREATE UNIQUE INDEX idx_oirs_cases_tracking_code ON oirs_cases(tracking_code);
CREATE INDEX idx_oirs_cases_status ON oirs_cases(status);
CREATE INDEX idx_oirs_cases_category ON oirs_cases(category);
CREATE INDEX idx_oirs_cases_account_id ON oirs_cases(citizen_account_id);
CREATE INDEX idx_oirs_cases_assigned_dept ON oirs_cases(assigned_department_id);
CREATE INDEX idx_oirs_cases_assigned_user ON oirs_cases(assigned_user_id);

ALTER TABLE oirs_cases ADD CONSTRAINT fk_oirs_cases_account
    FOREIGN KEY (citizen_account_id) REFERENCES citizen_accounts(id);
ALTER TABLE oirs_cases ADD CONSTRAINT fk_oirs_cases_department
    FOREIGN KEY (assigned_department_id) REFERENCES departments(id);
ALTER TABLE oirs_cases ADD CONSTRAINT fk_oirs_cases_assigned_user
    FOREIGN KEY (assigned_user_id) REFERENCES users(id);

ALTER TABLE oirs_cases ADD CONSTRAINT ck_oirs_cases_channel
    CHECK (channel IN ('web', 'email', 'phone', 'in_person', 'mail'));
ALTER TABLE oirs_cases ADD CONSTRAINT ck_oirs_cases_status
    CHECK (status IN ('submitted', 'in_review', 'in_process', 'responded', 'closed', 'cancelled'));
ALTER TABLE oirs_cases ADD CONSTRAINT ck_oirs_cases_closed_at
    CHECK (closed_at IS NULL OR closed_at >= submitted_at);
ALTER TABLE oirs_cases ADD CONSTRAINT ck_oirs_cases_auth_or_anonymous
    CHECK (
        (citizen_account_id IS NOT NULL) OR
        (anonymous_name IS NOT NULL AND
         (anonymous_email IS NOT NULL OR anonymous_phone IS NOT NULL) AND
         contact_consent = TRUE)
    );

CREATE TABLE oirs_messages (
    id BIGSERIAL PRIMARY KEY,
    oirs_case_id BIGINT NOT NULL,
    author_user_id BIGINT NULL,
    author_citizen_id BIGINT NULL,
    message_direction VARCHAR(30) NOT NULL,
    body TEXT NOT NULL,
    attachment_path VARCHAR(500),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oirs_messages_case_id ON oirs_messages(oirs_case_id);
CREATE INDEX idx_oirs_messages_author_user ON oirs_messages(author_user_id);
CREATE INDEX idx_oirs_messages_author_citizen ON oirs_messages(author_citizen_id);

ALTER TABLE oirs_messages ADD CONSTRAINT fk_oirs_messages_case
    FOREIGN KEY (oirs_case_id) REFERENCES oirs_cases(id);
ALTER TABLE oirs_messages ADD CONSTRAINT fk_oirs_messages_author_user
    FOREIGN KEY (author_user_id) REFERENCES users(id);
ALTER TABLE oirs_messages ADD CONSTRAINT fk_oirs_messages_author_citizen
    FOREIGN KEY (author_citizen_id) REFERENCES citizen_accounts(id);

ALTER TABLE oirs_messages ADD CONSTRAINT ck_oirs_messages_direction
    CHECK (message_direction IN ('from_citizen', 'from_officer', 'system'));
ALTER TABLE oirs_messages ADD CONSTRAINT ck_oirs_messages_author
    CHECK (author_user_id IS NOT NULL OR author_citizen_id IS NOT NULL);
ALTER TABLE oirs_messages ADD CONSTRAINT ck_oirs_messages_body_not_empty
    CHECK (length(trim(body)) > 0);
