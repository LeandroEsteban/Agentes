import { test, expect } from '@playwright/test';
import { loginInternal } from '../helpers/auth';
import { ensureDocumentExists, linkDocumentToExpedient } from '../helpers/expedient-fixtures';

const pathIs = (path: string, method: string) => (response: { url(): string; request(): { method(): string } }) => new URL(response.url()).pathname === path && response.request().method() === method;

test.describe('@E2E-06 expediente', () => {
  test('crear expediente por UI, asociar documento via API, timeline, cerrar, negativos', async ({ page, request: api }) => {
    const runId = Date.now();
    const subject = `E2E06-EXP-${runId}`;

    await loginInternal(page, 'internalDocumentUser');
    await page.goto('/intranet/expedients');
    await expect(page.getByRole('heading', { name: 'Expedientes' })).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo expediente' }).click();
    await page.getByLabel('Asunto *').fill(subject);
    await page.locator('label.field').filter({ hasText: 'Departamento' }).locator('select').selectOption({ index: 1 });
    const createdResponse = page.waitForResponse(pathIs('/api/v1/expedients', 'POST'));
    await page.getByRole('button', { name: 'Crear expediente' }).click();
    const created = await createdResponse;
    expect(created.ok()).toBeTruthy();
    const expedientId = (await created.json()).data.id;

    await expect(page.getByText(subject, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ver' }).first().click();
    await page.waitForURL(`/intranet/expedients/${expedientId}`);
    await expect(page.getByRole('heading', { name: /^Expediente/ })).toBeVisible();

    const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('siged.session') || '{}').token) as string;
    const docFixture = await ensureDocumentExists(api, runId);
    await linkDocumentToExpedient(api, token, expedientId, docFixture.document.id);

    const eventsRes = await api.get(`/api/v1/expedients/${expedientId}/events`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(eventsRes.ok()).toBeTruthy();
    const events = (await eventsRes.json()).data;
    expect(events.some((e: { event_type: string }) => e.event_type === 'document_linked')).toBeTruthy();
    expect(events.some((e: { event_type: string }) => e.event_type === 'created')).toBeTruthy();

    await page.reload();
    await page.getByRole('button', { name: 'Eventos' }).click();
    await expect(page.getByRole('table')).toBeVisible();

    await page.getByRole('button', { name: 'Detalle' }).click();
    const closeResponse = await api.post(`/api/v1/expedients/${expedientId}/close`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'closed' }
    });
    expect(closeResponse.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByText('closed')).toBeVisible();
  });

  test('negativo: crear expediente sin asunto muestra error', async ({ page }) => {
    await loginInternal(page, 'internalDocumentUser');
    await page.goto('/intranet/expedients');
    await page.getByRole('button', { name: 'Nuevo expediente' }).click();
    await page.getByRole('button', { name: 'Crear expediente' }).click();
    await expect(page.getByText('El asunto es requerido')).toBeVisible();
  });
});
