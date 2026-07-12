import { test, expect } from '@playwright/test';
import { loginInternal } from '../helpers/auth';

test.describe('@E2E-10 guards y permisos', () => {
  test('visitante redirigido a login, 404, funcionario sin permiso admin bloqueado', async ({ page }) => {
    await page.goto('/intranet');
    await page.waitForURL('/intranet/login');
    await expect(page.getByRole('heading', { name: 'Acceso intranet' })).toBeVisible();

    const notFoundResponse = await page.goto('/ruta-inexistente');
    expect(notFoundResponse?.status()).toBeLessThan(500);
    await expect(page.getByText('Volver al inicio')).toBeVisible();

    await loginInternal(page, 'internalDocumentUser');

    await page.goto('/intranet/admin/procedure-types');
    await expect(page.getByText('Acceso restringido')).toBeVisible();

    await page.goto('/intranet/expedients');
    await expect(page.getByRole('heading', { name: 'Expedientes' })).toBeVisible();
    await expect(page.getByText('Nuevo expediente')).toBeVisible();
  });

  test('ciudadano navega portal sin login, redirigido a login ciudadano', async ({ page }) => {
    await page.goto('/portal/requests');
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: 'Acceso ciudadano' })).toBeVisible();
  });

  test('portada publica carga sin autenticacion', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Servicios municipales' })).toBeVisible();
    await page.getByRole('link', { name: 'Ver tramites disponibles' }).click();
    await expect(page.getByRole('heading', { name: 'Tramites' })).toBeVisible();
  });
});
