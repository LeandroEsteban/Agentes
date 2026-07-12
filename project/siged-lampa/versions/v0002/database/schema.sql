-- SIGED-Lampa v0002 Schema
-- PostgreSQL 16+
-- Generated from Modelo_ER_Detallado_SIGED_Lampa.md
-- 40 functional tables + 1 technical table

-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Technical: Migration tracking
-- ============================================
CREATE TABLE schema_migrations (
    version VARCHAR PRIMARY KEY,
    checksum_sha256 VARCHAR NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    execution_ms BIGINT NOT NULL
);

-- ============================================
-- Domain: Organization (8-9)
-- ============================================
-- (See individual migration files for full DDL)
-- Tables: departments, external_entities

-- ============================================
-- Domain: Security (1-7)
-- ============================================
-- Tables: users, roles, permissions, user_roles,
--         role_permissions, sessions, two_factor_settings

-- ============================================
-- Domain: Document Catalogs (10-12)
-- ============================================
-- Tables: document_types, document_templates, document_statuses

-- ============================================
-- Domain: Document Management (13-21)
-- ============================================
-- Tables: documents, document_versions, document_attachments,
--         document_comments, document_review_requests,
--         document_review_responses, document_approvals,
--         document_signatures, signature_profiles

-- ============================================
-- Domain: Expedients (22-24)
-- ============================================
-- Tables: expedients, expedient_documents, expedient_events

-- ============================================
-- Domain: Correspondence (25-27)
-- ============================================
-- Tables: correspondence, correspondence_recipients,
--         correspondence_routes

-- ============================================
-- Domain: Citizen Portal (28-33)
-- ============================================
-- Tables: citizen_accounts, citizen_profiles, procedure_types,
--         published_procedures, citizen_requests,
--         citizen_request_attachments

-- ============================================
-- Domain: OIRS (34-35)
-- ============================================
-- Tables: oirs_cases, oirs_messages

-- ============================================
-- Domain: Public Content (36-38)
-- ============================================
-- Tables: news_posts, public_notices, calendar_events

-- ============================================
-- Domain: Notifications & Audit (39-40)
-- ============================================
-- Tables: notifications, audit_events

-- Full schema is maintained in individual versioned migrations
-- under database/migrations/ 001 through 013
