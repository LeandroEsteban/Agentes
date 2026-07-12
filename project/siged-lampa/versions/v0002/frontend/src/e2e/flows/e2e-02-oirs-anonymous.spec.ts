import { test, expect } from '@playwright/test';

test.describe('@E2E-02: OIRS anonima', () => {
  test('crear OIRS anonima, consultar tracking y agregar mensaje', async ({ page }) => {
    await page.goto('/oirs');
    await expect(page.getByRole('heading')).toContainText('Oficina de Informaciones');
    await page.getByLabel('Tipo de caso').selectOption('consulta');
    await page.getByLabel('Asunto').fill('E2E-02 seguimiento publico');
    await page.getByLabel('Descripción').fill('Descripcion de prueba para comprobar el seguimiento publico OIRS.');
    await page.getByLabel('Nombre').fill('Usuario QA');
    await page.getByLabel('Correo electrónico').fill(`e2e02-${Date.now()}@example.test`);
    await page.getByLabel('Acepto el tratamiento de mis datos para gestionar y responder esta solicitud OIRS').check();
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByText('Solicitud OIRS registrada')).toBeVisible();
    await expect(page.getByTestId('oirs-tracking-token')).not.toBeEmpty();
    await page.getByRole('button', { name: 'Consultar seguimiento' }).click();
    await expect(page.getByTestId('oirs-status')).toBeVisible();
    await expect(page.getByText('E2E-02 seguimiento publico')).toBeVisible();
    await page.getByLabel('Nuevo mensaje').fill('Mensaje adicional de seguimiento E2E-02');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByTestId('oirs-messages')).toContainText('Mensaje adicional de seguimiento E2E-02');
  });
});
