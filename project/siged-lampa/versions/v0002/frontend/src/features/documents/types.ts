export type Document = {
  id: number;
  title: string;
  document_type_id?: number;
  document_type_name?: string;
  department_id?: number;
  department_name?: string;
  description?: string;
  confidentiality_level?: string;
  due_date?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string;
};

export type DocumentType = { id: number; name: string };

export type Department = { id: number; name: string };

export type Attachment = {
  id: number;
  file_name: string;
  description?: string;
  file_size?: number;
  created_at?: string;
};

export type Comment = {
  id: number;
  content: string;
  author_name?: string;
  created_at: string;
};

export type Version = {
  id: number;
  version_number: number;
  summary: string;
  content?: string;
  created_at: string;
  created_by_name?: string;
};

export type HistoryEvent = {
  id: number;
  action: string;
  description?: string;
  actor_name?: string;
  created_at: string;
};

export type Review = {
  id: number;
  reviewer_name?: string;
  decision?: string;
  observations?: string;
  status: string;
  created_at: string;
};

export type Approval = {
  id: number;
  approver_user_id?: number;
  status: string;
};

export type Signature = {
  id: number;
  integration_mode: string;
  signer_name?: string;
  signature_hash?: string;
  signed_at?: string;
  status: string;
};
