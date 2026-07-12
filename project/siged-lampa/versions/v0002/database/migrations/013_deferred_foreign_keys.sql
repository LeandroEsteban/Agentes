ALTER TABLE departments ADD CONSTRAINT fk_departments_manager
    FOREIGN KEY (manager_user_id) REFERENCES users(id);

ALTER TABLE documents ADD CONSTRAINT fk_documents_current_version
    FOREIGN KEY (current_version_id) REFERENCES document_versions(id);

ALTER TABLE document_versions ADD CONSTRAINT fk_document_versions_previous
    FOREIGN KEY (previous_version_id) REFERENCES document_versions(id);
