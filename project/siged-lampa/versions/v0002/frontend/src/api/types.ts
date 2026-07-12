export type ActorType = 'citizen' | 'internal';
export type Session = { token: string; actorType: ActorType; user: { id: number; full_name?: string; username?: string; email?: string; permissions?: string[]; roles?: string[] } };
export type ApiEnvelope<T> = { ok: boolean; data: T; pagination?: { page: number; size: number; total: number; pages: number } };
export type Procedure = { id: number; slug: string; title: string; instructions: string; requirements_html?: string; procedure_type_name?: string; department_name?: string };
export type ExternalEntity = { id: number; entity_type: string; name: string; tax_id?: string; email?: string; phone?: string; status: 'active' | 'inactive' };
export type PublicNews = { id: number; uuid: string; slug: string; title: string; summary: string | null; published_at: string };
export type PublicNotice = { id: number; uuid: string; title: string; body_html: string; notice_type: string; start_at: string; end_at: string };
export type PublicCalendarEvent = { id: number; uuid: string; title: string; description: string | null; start_at: string; end_at: string; location: string | null; status: string };
