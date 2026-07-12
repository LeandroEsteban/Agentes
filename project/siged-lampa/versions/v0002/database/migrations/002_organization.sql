CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cost_center VARCHAR(50),
    parent_department_id BIGINT NULL,
    manager_user_id BIGINT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_departments_uuid ON departments(uuid);
CREATE UNIQUE INDEX idx_departments_code ON departments(code);

ALTER TABLE departments ADD CONSTRAINT fk_departments_parent
    FOREIGN KEY (parent_department_id) REFERENCES departments(id);

CREATE TABLE external_entities (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    entity_type VARCHAR(30) NOT NULL,
    name VARCHAR(300) NOT NULL,
    tax_id VARCHAR(50),
    email VARCHAR(254),
    phone VARCHAR(40),
    address TEXT,
    contact_name VARCHAR(200),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_external_entities_uuid ON external_entities(uuid);
CREATE INDEX idx_external_entities_tax_id ON external_entities(tax_id);
