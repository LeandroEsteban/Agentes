import { createContext, useEffect, useState, type ReactNode } from 'react';
import { setApiToken } from '../api/client';
import type { ActorType, Session } from '../api/types';
import { login, logoutRequest, profile } from './auth-service';
import { clearSession, loadSession, saveSession } from './auth-storage';

type AuthValue = { session: Session | null; loading: boolean; signIn: (actor: ActorType, identifier: string, password: string) => Promise<void>; signOut: () => Promise<void> };
export const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { const stored = loadSession(); if (!stored) { setLoading(false); return; } setApiToken(stored.token); if (stored.actorType === 'citizen') { setSession(stored); setLoading(false); return; } profile().then(({ data }) => setSession({ ...stored, user: data })).catch(() => { clearSession(); setApiToken(null); }).finally(() => setLoading(false)); }, []);
  const signIn = async (actorType: ActorType, identifier: string, password: string) => { const next = await login(actorType, identifier, password); setApiToken(next.token); const sessionWithProfile = actorType === 'citizen' ? next : { ...next, user: (await profile()).data }; saveSession(sessionWithProfile); setSession(sessionWithProfile); };
  const signOut = async () => { try { await logoutRequest(); } finally { clearSession(); setApiToken(null); setSession(null); } };
  return <AuthContext.Provider value={{ session, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}
