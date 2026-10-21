import { test, expect } from '@playwright/test';
import { desbordesHorizontales, entrarComoCoordinacion, simularPanel } from './helpers-panel';

/**
 * El panel administrativo tiene que poder usarse en un teléfono (checklist de densidad de la
 * auditoría: «no hay scroll horizontal dentro de cards a 320 px»).
 *
 * Se comprueba que ninguna pantalla del panel obliga a desplazar la página en horizontal y que
 * el listado de espacios cambia a tarjetas en pantallas estrechas.
 */

const PANTALLAS = [
  { nombre: 'Espacios', ruta: '/admin/espacios' },
  { nombre: 'Alertas', ruta: '/admin/alertas' },
  { nombre: 'Inicio', ruta: '/admin' },
  { nombre: 'Carga de datos', ruta: '/admin/carga' },
  { nombre: 'Cambio de laboratorio', ruta: '/admin/laboratorio' },
];

const ANCHOS = [320, 375, 390];

test.describe('El panel se usa en móvil (sin scroll horizontal)', () => {
  test.beforeEach(async ({ page }) => {
    await simularPanel(page);
    await entrarComoCoordinacion(page);
  });

  for (const ancho of ANCHOS) {
    test(`ninguna pantalla desborda a ${ancho} px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });

      for (const pantalla of PANTALLAS) {
        await page.goto(pantalla.ruta);
        await page.waitForTimeout(300);

        const desbordan = await desbordesHorizontales(page, ancho);
        expect(
          desbordan,
          `Elementos que se salen del ancho en ${pantalla.nombre} a ${ancho} px`,
        ).toEqual([]);
      }
    });
  }

  test('el listado de espacios pasa a tarjetas en pantallas estrechas', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/admin/espacios');

    // En tarjeta: cada espacio es un artículo con su identificador.
    await expect(page.getByRole('article').filter({ hasText: 'AULA-101' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);

    // En escritorio vuelve a ser una tabla.
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row', { name: /AULA-101/ })).toBeVisible();
  });

  test('el drawer de detalle cabe en la pantalla del móvil', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/admin/espacios');

    await page.getByRole('button', { name: 'Ver detalle de AULA-101' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    const anchoDrawer = await drawer.evaluate((el) => el.getBoundingClientRect().width);
    expect(anchoDrawer).toBeLessThanOrEqual(320);
  });
});
