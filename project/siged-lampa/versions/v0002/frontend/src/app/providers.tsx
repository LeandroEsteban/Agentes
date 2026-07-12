import type { ReactNode } from 'react';
import { AuthProvider } from '../auth/auth-context';
export const Providers = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
