export type ActorType = 'citizen' | 'internal';
export type Session = { token: string; actorType: ActorType; user: { id: number; full_name?: string; username?: string; email?: string; permissions?: string[]; roles?: string[] } };
export type ApiEnvelope<T> = { ok: boolean; data: T; pagination?: { page: number; size: number; total: number; pages: number } };
export type Procedure = { id: number; slug: string; title: string; instructions: string; requirements_html?: string; procedure_type_name?: string; department_name?: string };
export type ExternalEntity = { id: number; entity_type: string; name: string; tax_id?: string; email?: string; phone?: string; status: 'active' | 'inactive' };
