import { test, expect } from '@playwright/test';
import { loginInternal } from '../helpers/auth';
import { createCorrespondence } from '../helpers/correspondence-fixtures';

test.describe('@E2E-07 correspondencia', () => {
  test('crear correspondencia via API, ver listado, ruta y cierre', async ({ page, request: api }) => {
    const runId = Date.now();
    const { token, correspondence, departments } = await createCorrespondence(api, runId);

    await loginInternal(page, 'internalDocumentUser');
    await page.goto('/intranet/correspondence');
    await expect(page.getByRole('heading', { name: 'Correspondencia' })).toBeVisible();
    await expect(page.getByText(`E2E07-CORR-${runId}`)).toBeVisible();

    const routeDest = departments.find((d) => d.code === 'JURIDICO');
    const routeResponse = await api.post(`/api/v1/correspondence/${correspondence.id}/route`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { to_department_id: routeDest!.id, instructions: `Derivar a Juridico ${runId}` }
    });
    expect(routeResponse.ok()).toBeTruthy();

    const closeResponse = await api.post(`/api/v1/correspondence/${correspondence.id}/close`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { observation: `Cierre E2E07 ${runId}` }
    });
    expect(closeResponse.ok()).toBeTruthy();
  });

  test('negativo: crear correspondencia via UI con remitente vacio falla', async ({ page }) => {
    await loginInternal(page, 'internalDocumentUser');
    await page.goto('/intranet/correspondence/new');
    await expect(page.getByRole('heading', { name: 'Nueva correspondencia' })).toBeVisible();
    await page.getByLabel('Asunto *').fill(`E2E07-NEG-${Date.now()}`);
    await page.getByLabel('Dirección *').selectOption('incoming');
    await page.getByLabel('Destinatario *').fill('Test');
    await page.getByRole('button', { name: 'Guardar correspondencia' }).click();
    await expect(page.getByText('El remitente es requerido')).toBeVisible();
  });
});
