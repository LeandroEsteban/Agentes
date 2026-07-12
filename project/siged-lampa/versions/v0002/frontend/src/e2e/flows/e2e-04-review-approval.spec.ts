import { test, expect } from '@playwright/test';
import { loginInternal } from '../helpers/auth';
import { documentWithReviewAssigned, requestApproval } from '../helpers/document-fixtures';

test.describe('@E2E-04 revision y aprobacion', () => {
  test('responde revision asignada y aprueba solicitud pendiente', async ({ page, request }) => {
    const fixture = await documentWithReviewAssigned(request);
    await loginInternal(page, 'reviewer');
    await page.goto('/intranet/reviews');
    await expect(page.getByText(fixture.document.title)).toBeVisible();
    await page.getByRole('button', { name: 'Revisar' }).click();
    await page.getByLabel('Decision').selectOption('approved');
    await page.getByLabel('Observaciones').fill('Revision aprobada por QA');
    const reviewResponse = page.waitForResponse((response) => /\/api\/v1\/reviews\/\d+\/reply$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Enviar revision' }).click();
    expect((await reviewResponse).ok()).toBeTruthy();
    await page.getByRole('button', { name: 'Cerrar sesion' }).click();

    await requestApproval(request, fixture.document.id, fixture.officerToken, fixture.approver.id);
    await loginInternal(page, 'approver');
    await page.goto('/intranet/approvals');
    await expect(page.getByText(fixture.document.title)).toBeVisible();
    await page.getByRole('listitem').filter({ hasText: fixture.document.title }).getByRole('button', { name: 'Aprobar / Rechazar' }).click();
    await page.getByLabel('Aprobar').check();
    const decisionResponse = page.waitForResponse((response) => /\/api\/v1\/approvals\/\d+\/decision$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirmar decision' }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    expect((await decisionResponse).ok()).toBeTruthy();
    await page.goto(`/intranet/documents/${fixture.document.id}`);
    await expect(page.getByText('approved')).toBeVisible();
  });
});
