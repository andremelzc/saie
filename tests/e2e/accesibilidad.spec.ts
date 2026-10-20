import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComoCoordinacion, simularPanel } from './helpers-panel';

/**
 * Accesibilidad del panel en un navegador real (Issue 3.23 / spec 03).
 *
 * En `frontend/src/test/axe.ts` (vitest + jsdom) no se puede comprobar el contraste de color ni
 * el texto visible: jsdom no aplica CSS ni calcula layout. Aquí sí: el navegador renderiza la
 * pantalla con sus estilos, así que axe puede medir el contraste real.
 *
 * Se falla con violaciones `serious` o `critical`, que es lo que pide la spec 03.
 */

const PANTALLAS = [
  { nombre: 'Espacios', ruta: '/admin/espacios' },
  { nombre: 'Alertas', ruta: '/admin/alertas' },
  { nombre: 'Inicio', ruta: '/admin' },
  { nombre: 'Carga de datos', ruta: '/admin/carga' },
  { nombre: 'Cambio de laboratorio', ruta: '/admin/laboratorio' },
];

const IMPACTOS_GRAVES = ['serious', 'critical'];

test.describe('Accesibilidad del panel con axe en navegador real (Issue 3.23)', () => {
  test.beforeEach(async ({ page }) => {
    await simularPanel(page);
    await entrarComoCoordinacion(page);
  });

  for (const pantalla of PANTALLAS) {
    test(`${pantalla.nombre} no tiene violaciones de accesibilidad grave`, async ({ page }) => {
      await page.goto(pantalla.ruta);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const resultados = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const graves = resultados.violations.filter((v) =>
        IMPACTOS_GRAVES.includes(v.impact ?? 'minor'),
      );

      expect(
        graves.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodo/s)`),
        `Violaciones de accesibilidad grave en ${pantalla.nombre}`,
      ).toEqual([]);
    });
  }

  test('el formulario de espacio en el drawer no tiene violaciones graves', async ({ page }) => {
    await page.goto('/admin/espacios');
    await page.getByRole('button', { name: 'Ver detalle de AULA-101' }).click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    const resultados = await new AxeBuilder({ page }).include(await drawer.elementHandle()).analyze();
    const graves = resultados.violations.filter((v) =>
      IMPACTOS_GRAVES.includes(v.impact ?? 'minor'),
    );

    expect(
      graves.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodo/s)`),
      'Violaciones de accesibilidad grave en el formulario de espacio',
    ).toEqual([]);
  });
});
