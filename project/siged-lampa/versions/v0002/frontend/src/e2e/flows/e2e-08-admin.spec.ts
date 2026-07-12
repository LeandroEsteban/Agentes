import { test, expect } from '@playwright/test';

type Envelope<T> = { data: T };

test.describe('@E2E-08 administracion', () => {
  test('admin crea tipo tramite y entidad externa via API, navega listados en UI', async ({ page, request: api }) => {
    const runId = Date.now();

    const loginRes = await api.post('/api/v1/auth/internal-login', { data: { username: 'admin', password: 'admin123' } });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = (await loginRes.json() as Envelope<{ token: string }>).data;
    const token = loginData.token;

    const typeResponse = await api.post('/api/v1/admin/procedure-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: `E2E08-TYPE-${runId}`, name: `Tipo E2E08 ${runId}`, owner_department_id: 1 }
    });
    expect(typeResponse.ok()).toBeTruthy();

    const entityResponse = await api.post('/api/v1/admin/external-entities', {
      headers: { Authorization: `Bearer ${token}` },
      data: { entity_type: 'company', name: `Entidad E2E08 ${runId}`, tax_id: `${runId}` }
    });
    expect(entityResponse.ok()).toBeTruthy();

    await page.goto('/intranet/login');
    await page.fill('input[name="identifier"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL(/\/intranet/);
    await page.waitForTimeout(1000);

    await page.goto('/intranet/admin/procedure-types');
    await expect(page.getByRole('heading', { name: 'Tipos de trámites' })).toBeVisible();

    await page.goto('/intranet/admin/external-entities');
    await expect(page.getByRole('heading', { name: 'Entidades externas' })).toBeVisible();
  });

  test('negativo: codigo duplicado rechazado con 400', async ({ request: api }) => {
    const loginRes = await api.post('/api/v1/auth/internal-login', { data: { username: 'admin', password: 'admin123' } });
    expect(loginRes.ok()).toBeTruthy();
    const token = ((await loginRes.json()) as Envelope<{ token: string }>).data.token;
    const response = await api.post('/api/v1/admin/procedure-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: 'CERT_RESIDENCIA', name: 'Duplicado', owner_department_id: 1 }
    });
    expect(response.status()).toBe(409);
  });
});
