CREATE TABLE citizen_accounts (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_citizen_accounts_uuid ON citizen_accounts(uuid);
CREATE UNIQUE INDEX idx_citizen_accounts_email ON citizen_accounts(email);
CREATE INDEX idx_citizen_accounts_status ON citizen_accounts(status);

CREATE TABLE citizen_profiles (
    id BIGSERIAL PRIMARY KEY,
    citizen_account_id BIGINT NOT NULL,
    national_id VARCHAR(20) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    phone VARCHAR(40),
    address TEXT,
    commune VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_citizen_profiles_account_id ON citizen_profiles(citizen_account_id);
CREATE UNIQUE INDEX idx_citizen_profiles_national_id ON citizen_profiles(national_id);
CREATE INDEX idx_citizen_profiles_full_name ON citizen_profiles(full_name);

ALTER TABLE citizen_profiles ADD CONSTRAINT fk_citizen_profiles_account
    FOREIGN KEY (citizen_account_id) REFERENCES citizen_accounts(id);

CREATE TABLE procedure_types (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    owner_department_id BIGINT NOT NULL,
    requires_login BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_days INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_procedure_types_uuid ON procedure_types(uuid);
CREATE UNIQUE INDEX idx_procedure_types_code ON procedure_types(code);
CREATE INDEX idx_procedure_types_department ON procedure_types(owner_department_id);

ALTER TABLE procedure_types ADD CONSTRAINT fk_procedure_types_department
    FOREIGN KEY (owner_department_id) REFERENCES departments(id);

ALTER TABLE procedure_types ADD CONSTRAINT ck_procedure_types_estimated_days
    CHECK (estimated_days > 0);

CREATE TABLE published_procedures (
    id BIGSERIAL PRIMARY KEY,
    procedure_type_id BIGINT NOT NULL,
    slug VARCHAR(150) NOT NULL,
    title VARCHAR(300) NOT NULL,
    instructions TEXT,
    requirements_html TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    published_by BIGINT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_published_procedures_slug ON published_procedures(slug);
CREATE INDEX idx_published_procedures_type_id ON published_procedures(procedure_type_id);
CREATE INDEX idx_published_procedures_active ON published_procedures(is_active);

ALTER TABLE published_procedures ADD CONSTRAINT fk_published_procedures_type
    FOREIGN KEY (procedure_type_id) REFERENCES procedure_types(id);
ALTER TABLE published_procedures ADD CONSTRAINT fk_published_procedures_published_by
    FOREIGN KEY (published_by) REFERENCES users(id);

CREATE TABLE citizen_requests (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) NOT NULL,
    citizen_account_id BIGINT NOT NULL,
    published_procedure_id BIGINT NOT NULL,
    assigned_department_id BIGINT NULL,
    expedient_id BIGINT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolution_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_citizen_requests_uuid ON citizen_requests(uuid);
CREATE UNIQUE INDEX idx_citizen_requests_tracking_code ON citizen_requests(tracking_code);
CREATE INDEX idx_citizen_requests_account_id ON citizen_requests(citizen_account_id);
CREATE INDEX idx_citizen_requests_status ON citizen_requests(status);
CREATE INDEX idx_citizen_requests_submitted_at ON citizen_requests(submitted_at);
CREATE INDEX idx_citizen_requests_procedure_id ON citizen_requests(published_procedure_id);

ALTER TABLE citizen_requests ADD CONSTRAINT fk_citizen_requests_account
    FOREIGN KEY (citizen_account_id) REFERENCES citizen_accounts(id);
ALTER TABLE citizen_requests ADD CONSTRAINT fk_citizen_requests_procedure
    FOREIGN KEY (published_procedure_id) REFERENCES published_procedures(id);
ALTER TABLE citizen_requests ADD CONSTRAINT fk_citizen_requests_department
    FOREIGN KEY (assigned_department_id) REFERENCES departments(id);
ALTER TABLE citizen_requests ADD CONSTRAINT fk_citizen_requests_expedient
    FOREIGN KEY (expedient_id) REFERENCES expedients(id);

ALTER TABLE citizen_requests ADD CONSTRAINT ck_citizen_requests_status
    CHECK (status IN ('submitted', 'in_review', 'in_process', 'completed', 'rejected', 'cancelled'));
ALTER TABLE citizen_requests ADD CONSTRAINT ck_citizen_requests_resolved_at
    CHECK (resolved_at IS NULL OR resolved_at >= submitted_at);

CREATE TABLE citizen_request_attachments (
    id BIGSERIAL PRIMARY KEY,
    citizen_request_id BIGINT NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_citizen_request_attachments_request_id ON citizen_request_attachments(citizen_request_id);

ALTER TABLE citizen_request_attachments ADD CONSTRAINT fk_citizen_request_attachments_request
    FOREIGN KEY (citizen_request_id) REFERENCES citizen_requests(id);

ALTER TABLE citizen_request_attachments ADD CONSTRAINT ck_citizen_request_attachments_file_size
    CHECK (file_size >= 0);
