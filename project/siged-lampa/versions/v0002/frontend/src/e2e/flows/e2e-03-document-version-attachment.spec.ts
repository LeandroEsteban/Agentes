import { test, expect } from '@playwright/test';
import { loginInternal } from '../helpers/auth';

const pathIs = (path: string, method: string) => (response: { url(): string; request(): { method(): string } }) => new URL(response.url()).pathname === path && response.request().method() === method;

test.describe('@E2E-03 documento, version y anexo', () => {
  test('crea documento, version y anexo mediante UI real', async ({ page }) => {
    const runId = `${Date.now()}`;
    const title = `E2E03-DOC-${runId}`;
    await loginInternal(page, 'internalDocumentUser');
    await page.goto('/intranet/documents');
    await expect(page.getByRole('heading', { name: 'Bandeja documental' })).toBeVisible();
    await page.getByRole('link', { name: 'Nuevo documento' }).click();
    await page.getByLabel('Titulo').fill(title);
    await page.getByLabel('Tipo documental').selectOption({ index: 1 });
    await page.getByLabel('Departamento').selectOption({ index: 1 });
    await page.getByLabel('Contenido').fill(`Contenido documental ${runId}`);
    const created = page.waitForResponse((response) => pathIs('/api/v1/documents', 'POST')(response));
    await page.getByRole('button', { name: 'Crear documento' }).click();
    expect((await created).ok()).toBeTruthy();
    await page.waitForURL((url) => /^\/intranet\/documents\/\d+$/.test(url.pathname));
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.getByRole('link', { name: 'Versiones' }).click();
    await page.getByLabel('Resumen').fill(`Version 2 ${runId}`);
    await page.getByLabel('Contenido').fill(`Contenido version 2 ${runId}`);
    const version = page.waitForResponse((response) => /\/api\/v1\/documents\/\d+\/versions$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Crear version' }).click();
    expect((await version).ok()).toBeTruthy();
    await expect(page.getByText('v2')).toBeVisible();

    await page.goto(page.url().replace('/versions', ''));
    await page.getByLabel('Seleccionar archivo').setInputFiles({ name: 'e2e03.txt', mimeType: 'text/plain', buffer: Buffer.from(`E2E03 attachment ${runId}`) });
    const attachment = page.waitForResponse((response) => /\/api\/v1\/documents\/\d+\/attachments$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Subir' }).click();
    expect((await attachment).ok()).toBeTruthy();
    await expect(page.getByText('e2e03.txt')).toBeVisible();
    await expect(page.getByText('document_version_created')).toBeVisible();
    await expect(page.getByText('document_attachment_added')).toBeVisible();
  });
});
