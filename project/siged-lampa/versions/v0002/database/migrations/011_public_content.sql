CREATE TABLE news_posts (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    slug VARCHAR(150) NOT NULL,
    title VARCHAR(300) NOT NULL,
    summary TEXT,
    content_html TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    author_user_id BIGINT NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_news_posts_uuid ON news_posts(uuid);
CREATE UNIQUE INDEX idx_news_posts_slug ON news_posts(slug);
CREATE INDEX idx_news_posts_status ON news_posts(status);
CREATE INDEX idx_news_posts_published_at ON news_posts(published_at);
CREATE INDEX idx_news_posts_author ON news_posts(author_user_id);

ALTER TABLE news_posts ADD CONSTRAINT fk_news_posts_author
    FOREIGN KEY (author_user_id) REFERENCES users(id);

ALTER TABLE news_posts ADD CONSTRAINT ck_news_posts_status
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE TABLE public_notices (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    body_html TEXT NOT NULL,
    notice_type VARCHAR(30) NOT NULL DEFAULT 'general',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    author_user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_public_notices_uuid ON public_notices(uuid);
CREATE INDEX idx_public_notices_status ON public_notices(status);
CREATE INDEX idx_public_notices_author ON public_notices(author_user_id);
CREATE INDEX idx_public_notices_date_range ON public_notices(start_at, end_at);

ALTER TABLE public_notices ADD CONSTRAINT fk_public_notices_author
    FOREIGN KEY (author_user_id) REFERENCES users(id);

ALTER TABLE public_notices ADD CONSTRAINT ck_public_notices_type
    CHECK (notice_type IN ('general', 'urgent', 'emergency', 'celebration'));
ALTER TABLE public_notices ADD CONSTRAINT ck_public_notices_status
    CHECK (status IN ('draft', 'active', 'expired'));
ALTER TABLE public_notices ADD CONSTRAINT ck_public_notices_end_at
    CHECK (end_at >= start_at);

CREATE TABLE calendar_events (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    audience VARCHAR(30) NOT NULL DEFAULT 'public',
    location VARCHAR(300),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    department_id BIGINT NULL,
    owner_user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_calendar_events_uuid ON calendar_events(uuid);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_calendar_events_date_range ON calendar_events(start_at, end_at);
CREATE INDEX idx_calendar_events_department ON calendar_events(department_id);
CREATE INDEX idx_calendar_events_owner ON calendar_events(owner_user_id);

ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_department
    FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id);

ALTER TABLE calendar_events ADD CONSTRAINT ck_calendar_events_audience
    CHECK (audience IN ('public', 'internal', 'department'));
ALTER TABLE calendar_events ADD CONSTRAINT ck_calendar_events_status
    CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed'));
ALTER TABLE calendar_events ADD CONSTRAINT ck_calendar_events_end_at
    CHECK (end_at >= start_at);
