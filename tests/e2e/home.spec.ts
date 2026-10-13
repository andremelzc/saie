import { test, expect } from '@playwright/test';

test.describe('Portal SAIE - Pruebas E2E', () => {
  test('debe cargar la página principal y verificar estructura de inicio', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'SAIE' })).toBeVisible();
    await expect(page.getByText('Sistema de Asignación Inteligente de Espacios')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bienvenido a SAIE' })).toBeVisible();
  });

  test('debe desplegar las tarjetas de los 3 portales del sistema', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Portal del Estudiante')).toBeVisible();
    await expect(page.getByText('Portal Docente')).toBeVisible();
    await expect(page.getByText('Portal Administrativo')).toBeVisible();
  });

  test('cada tarjeta lleva a su pantalla de login', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('portal-docente').click();
    await expect(page).toHaveURL(/\/login\/docente$/);
  });
});
