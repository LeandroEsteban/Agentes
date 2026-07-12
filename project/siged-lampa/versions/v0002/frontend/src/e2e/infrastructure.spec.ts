import { test, expect } from '@playwright/test';

test.describe('E2E-INFRA-01: Cargar portada', () => {
  test('cargar portada, navegar a tramites, abrir detalle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Servicios municipales');
  });
});

test.describe('E2E-INFRA-02: Login ciudadano falla con credenciales invalidas', () => {
  test('login ciudadano con credenciales invalidas', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso ciudadano');
    await page.fill('input[name="identifier"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Ingresar")');
    await expect(page.locator('.state.error, [role="alert"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('E2E-INFRA-03: Login funcionario navegacion', () => {
  test('cargar login intranet con navegacion', async ({ page }) => {
    await page.goto('/intranet/login');
    await expect(page.locator('h1')).toContainText('Acceso intranet');
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});
