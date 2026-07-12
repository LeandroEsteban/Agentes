import { PermissionDenied } from '../components/feedback';
import { useAuth } from './use-auth';
export function RequirePermission({ permission, children }: { permission?: string; children: React.ReactNode }) { const permissions = useAuth().session?.user.permissions || []; return !permission || permissions.includes(permission) || permissions.includes('admin.access') ? <>{children}</> : <PermissionDenied />; }
