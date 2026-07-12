import { Navigate } from 'react-router-dom';
import { useAuth } from './use-auth';
export function RequireActor({ actor, children }: { actor: 'citizen' | 'internal'; children: React.ReactNode }) { return useAuth().session?.actorType === actor ? <>{children}</> : <Navigate to="/forbidden" replace />; }
