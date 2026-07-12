import { test, expect } from '@playwright/test';
import { loginInternal } from '../helpers/auth';
import { documentApprovedForSignature } from '../helpers/document-fixtures';

test.describe('@E2E-05 firma academica simulada', () => {
  test('firma un documento aprobado con perfil academico real', async ({ page, request }) => {
    const document = await documentApprovedForSignature(request);
    await loginInternal(page, 'signer');
    await page.goto(`/intranet/documents/${document.id}/signature`);
    await expect(page.getByRole('heading', { name: 'Firma academica simulada' })).toBeVisible();
    const signature = page.waitForResponse((response) => /\/api\/v1\/documents\/\d+\/signatures$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Firmar documento' }).click();
    expect((await signature).ok()).toBeTruthy();
    await expect(page.getByRole('status')).toContainText('Documento firmado exitosamente');
    await page.goto(`/intranet/documents/${document.id}`);
    await expect(page.getByText('signed', { exact: true })).toBeVisible();
  });
});
