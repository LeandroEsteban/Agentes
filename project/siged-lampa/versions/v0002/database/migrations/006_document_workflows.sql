CREATE TABLE document_comments (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    author_user_id BIGINT NOT NULL,
    version_id BIGINT NULL,
    comment_type VARCHAR(30) NOT NULL DEFAULT 'general',
    body TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX idx_document_comments_author ON document_comments(author_user_id);
CREATE INDEX idx_document_comments_version_id ON document_comments(version_id);

ALTER TABLE document_comments ADD CONSTRAINT fk_document_comments_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE document_comments ADD CONSTRAINT fk_document_comments_author
    FOREIGN KEY (author_user_id) REFERENCES users(id);
ALTER TABLE document_comments ADD CONSTRAINT fk_document_comments_version
    FOREIGN KEY (version_id) REFERENCES document_versions(id);
ALTER TABLE document_comments ADD CONSTRAINT fk_document_comments_resolved_by
    FOREIGN KEY (resolved_by) REFERENCES users(id);

ALTER TABLE document_comments ADD CONSTRAINT ck_document_comments_type
    CHECK (comment_type IN ('general', 'observation', 'correction', 'legal'));
ALTER TABLE document_comments ADD CONSTRAINT ck_document_comments_body_not_empty
    CHECK (length(trim(body)) > 0);

CREATE TABLE document_review_requests (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    reviewer_user_id BIGINT NOT NULL,
    review_round INT NOT NULL DEFAULT 1,
    instructions TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_review_requests_document_id ON document_review_requests(document_id);
CREATE INDEX idx_document_review_requests_reviewer ON document_review_requests(reviewer_user_id);
CREATE INDEX idx_document_review_requests_status ON document_review_requests(status);

ALTER TABLE document_review_requests ADD CONSTRAINT fk_document_review_requests_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE document_review_requests ADD CONSTRAINT fk_document_review_requests_requested_by
    FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE document_review_requests ADD CONSTRAINT fk_document_review_requests_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES users(id);
ALTER TABLE document_review_requests ADD CONSTRAINT fk_document_review_requests_reviewer_not_requester
    CHECK (requested_by <> reviewer_user_id);

ALTER TABLE document_review_requests ADD CONSTRAINT ck_document_review_requests_status
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'cancelled'));
ALTER TABLE document_review_requests ADD CONSTRAINT ck_document_review_requests_round
    CHECK (review_round > 0);

CREATE TABLE document_review_responses (
    id BIGSERIAL PRIMARY KEY,
    review_request_id BIGINT NOT NULL,
    reviewer_user_id BIGINT NOT NULL,
    decision VARCHAR(30) NOT NULL,
    observations TEXT,
    requires_changes BOOLEAN NOT NULL DEFAULT FALSE,
    responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_review_responses_request_id ON document_review_responses(review_request_id);
CREATE INDEX idx_document_review_responses_reviewer ON document_review_responses(reviewer_user_id);

ALTER TABLE document_review_responses ADD CONSTRAINT fk_document_review_responses_request
    FOREIGN KEY (review_request_id) REFERENCES document_review_requests(id);
ALTER TABLE document_review_responses ADD CONSTRAINT fk_document_review_responses_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES users(id);

ALTER TABLE document_review_responses ADD CONSTRAINT ck_document_review_responses_decision
    CHECK (decision IN ('approved', 'rejected', 'changes_requested', 'needs_clarification'));

CREATE TABLE signature_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    position_label VARCHAR(200),
    provider VARCHAR(50) NOT NULL DEFAULT 'simulated',
    certificate_alias VARCHAR(100),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signature_profiles_user_id ON signature_profiles(user_id);

ALTER TABLE signature_profiles ADD CONSTRAINT fk_signature_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id);

CREATE TABLE document_approvals (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    approver_user_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    sequence_order INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    decision_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_document_approvals_unique ON document_approvals(document_id, approver_user_id, sequence_order);
CREATE INDEX idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX idx_document_approvals_approver ON document_approvals(approver_user_id);
CREATE INDEX idx_document_approvals_status ON document_approvals(status);

ALTER TABLE document_approvals ADD CONSTRAINT fk_document_approvals_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE document_approvals ADD CONSTRAINT fk_document_approvals_approver
    FOREIGN KEY (approver_user_id) REFERENCES users(id);
ALTER TABLE document_approvals ADD CONSTRAINT fk_document_approvals_requested_by
    FOREIGN KEY (requested_by) REFERENCES users(id);

ALTER TABLE document_approvals ADD CONSTRAINT ck_document_approvals_sequence_order
    CHECK (sequence_order > 0);
ALTER TABLE document_approvals ADD CONSTRAINT ck_document_approvals_status
    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped'));

CREATE TABLE document_signatures (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    signer_user_id BIGINT NOT NULL,
    signature_profile_id BIGINT NULL,
    signature_mode VARCHAR(30) NOT NULL DEFAULT 'simulated',
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    signature_hash TEXT,
    signature_status VARCHAR(30) NOT NULL DEFAULT 'valid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_signer ON document_signatures(signer_user_id);

ALTER TABLE document_signatures ADD CONSTRAINT fk_document_signatures_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE document_signatures ADD CONSTRAINT fk_document_signatures_signer
    FOREIGN KEY (signer_user_id) REFERENCES users(id);
ALTER TABLE document_signatures ADD CONSTRAINT fk_document_signatures_profile
    FOREIGN KEY (signature_profile_id) REFERENCES signature_profiles(id);

ALTER TABLE document_signatures ADD CONSTRAINT ck_document_signatures_mode
    CHECK (signature_mode IN ('simulated', 'digital', 'physical_upload', 'firmagob'));
ALTER TABLE document_signatures ADD CONSTRAINT ck_document_signatures_status
    CHECK (signature_status IN ('valid', 'invalid', 'revoked', 'expired'));
