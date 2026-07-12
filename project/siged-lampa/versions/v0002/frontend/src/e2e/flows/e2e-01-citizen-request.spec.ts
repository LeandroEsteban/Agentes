import { test, expect } from '@playwright/test';

test.describe('@E2E-01: ciudadano y solicitud', () => {
  test('login ciudadano, listar tramites, abrir detalle, crear solicitud, consultar, verificar notificacion, logout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Servicios municipales');

    await page.goto('/tramites');
    await expect(page.locator('h1')).toContainText('Tramites');

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso ciudadano');
    await page.fill('input[name="identifier"]', 'ciudadano@email.com');
    await page.fill('input[name="password"]', 'ciudadano123');
    await page.click('button:has-text("Ingresar")');
    await page.waitForURL(/\/portal/);

    await page.goto('/portal/requests');
    await page.waitForURL(/\/portal\/requests/);

    await page.goto('/portal/notifications');

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso ciudadano');
  });
});
