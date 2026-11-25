import { test, expect } from '@playwright/test';

test.describe('Portal SAIE - Pruebas E2E', () => {
  test('debe cargar la página principal y verificar estructura de inicio', async ({ page }) => {
    await page.goto('/');

    // El logo ya no es un heading (Issue #358 / PR #378): el único h1 es el título del saludo.
    await expect(page.getByRole('img', { name: 'SAIE', exact: true })).toBeVisible();
    await expect(page.getByText('Sistema de Asignación Inteligente de Espacios')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Bienvenido a SAIE' })).toBeVisible();
  });

  test('debe desplegar las tarjetas de los 3 portales del sistema', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Portal del Estudiante' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Portal Docente' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Portal Administrativo' })).toBeVisible();
  });

  test('cada tarjeta lleva a su pantalla de login', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('portal-docente').click();
    await expect(page).toHaveURL(/\/login\/docente$/);
  });
});
