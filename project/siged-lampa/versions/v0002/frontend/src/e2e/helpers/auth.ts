import { expect, type Page } from '@playwright/test';

export type InternalActor = 'internalDocumentUser' | 'reviewer' | 'approver' | 'signer' | 'internalUserWithoutPermission' | 'administrator';
const actors: Record<InternalActor, { username: string; password: string; allowed: string; absent: string }> = {
  internalDocumentUser: { username: 'funcionario', password: 'officer123', allowed: 'documents.create', absent: 'documents.sign' },
  reviewer: { username: 'revisor', password: 'reviewer123', allowed: 'documents.review', absent: 'documents.sign' },
  approver: { username: 'aprobador', password: 'reviewer123', allowed: 'documents.review', absent: 'documents.sign' },
  signer: { username: 'firmante', password: 'reviewer123', allowed: 'documents.sign', absent: 'documents.review' },
  internalUserWithoutPermission: { username: 'sinpermiso', password: 'reviewer123', allowed: 'documents.view', absent: 'documents.sign' },
  administrator: { username: 'admin', password: 'admin123', allowed: 'admin.access', absent: 'nonexistent.permission' },
};

export async function loginInternal(page: Page, actor: InternalActor) {
  const credentials = actors[actor];
  await page.goto('/intranet/login');
  const loginResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/auth/internal-login' && response.request().method() === 'POST');
  const profileResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/profile/me' && response.request().method() === 'GET');
  await page.getByLabel('Usuario').fill(credentials.username);
  await page.getByLabel('Contrasena').fill(credentials.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const login = await loginResponse;
  expect(login.ok(), `${actor}: login status ${login.status()}`).toBeTruthy();
  const profile = await profileResponse;
  expect(profile.ok(), `${actor}: profile status ${profile.status()}`).toBeTruthy();
  await page.waitForURL((url) => url.pathname.startsWith('/intranet') && url.pathname !== '/intranet/login');
  await expect(page.getByTestId('authenticated-user')).toBeVisible();
  await expect(page.getByTestId('authenticated-user')).toHaveAttribute('data-actor', 'internal');
  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('siged.session') || '{}')) as { user: { username: string; permissions: string[] } };
  expect(session.user.username).toBe(credentials.username);
  expect(session.user.permissions).toContain(credentials.allowed);
  expect(session.user.permissions).not.toContain(credentials.absent);
  await expect(page.getByText('Credenciales invalidas')).toHaveCount(0);
}
