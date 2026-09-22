import { test, expect } from '@playwright/test';

test.describe('Portal SAIE - Pruebas E2E', () => {
  test('debe cargar la página principal y verificar estructura de inicio', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'SAIE' })).toBeVisible();
    await expect(page.getByText('Sistema de Apoyo a la Integración Escolar')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Plataforma de Integración y Acompañamiento Escolar' }),
    ).toBeVisible();
  });

  test('debe desplegar las tarjetas de los 4 portales del sistema', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Portal Directivo / Admin')).toBeVisible();
    await expect(page.getByText('Portal Docente')).toBeVisible();
    await expect(page.getByText('Portal Profesional')).toBeVisible();
    await expect(page.getByText('Portal Familias')).toBeVisible();
  });
});
