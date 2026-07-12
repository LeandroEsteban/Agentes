import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './use-auth';
import { LoadingState } from '../components/feedback';
export function RequireAuth({ children }: { children: React.ReactNode }) { const { session, loading } = useAuth(); const location = useLocation(); if (loading) return <LoadingState />; return session ? <>{children}</> : <Navigate to={location.pathname.startsWith('/intranet') ? '/intranet/login' : '/login'} replace state={{ from: location.pathname }} />; }
