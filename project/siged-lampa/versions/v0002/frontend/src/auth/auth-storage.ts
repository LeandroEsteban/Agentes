import type { Session } from '../api/types';
const key = 'siged.session';
export const loadSession = (): Session | null => { try { const value = sessionStorage.getItem(key); return value ? JSON.parse(value) as Session : null; } catch { return null; } };
export const saveSession = (session: Session) => sessionStorage.setItem(key, JSON.stringify(session));
export const clearSession = () => sessionStorage.removeItem(key);
