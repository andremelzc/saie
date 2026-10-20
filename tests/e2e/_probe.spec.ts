import { test, expect } from '@playwright/test';

/** Sonda temporal: lista los elementos que desbordan horizontalmente a 320 px. */
const PANTALLAS = [
  { nombre: 'Espacios', ruta: '/admin/espacios' },
  { nombre: 'Alertas', ruta: '/admin/alertas' },
  { nombre: 'Inicio', ruta: '/admin' },
  { nombre: 'Carga', ruta: '/admin/carga' },
  { nombre: 'Laboratorio', ruta: '/admin/laboratorio' },
];

const ANCHO = 320;

test.describe('sonda', () => {
  test('desbordes', async ({ page }) => {
    await page.route('**/api/v1/auth/admin/login', async (route) => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const token = `${b64({ alg: 'HS256' })}.${b64({ rol: 'COORDINACION_ACADEMICA', exp: Math.floor(Date.now() / 1000) + 3600 })}.f`;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { token, rol: 'COORDINACION_ACADEMICA', debeCambiarClave: false, expiresIn: '8h' },
        }),
      });
    });
    await page.route('**/api/v1/admin/espacios**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'e1',
              identificador: 'AULA-101',
              tipo: 'AULA_TEORICA',
              pabellon: 'Antiguo Pabellón',
              piso: 1,
              aforoNominal: 40,
              softwareInstalado: null,
              pcsMalogradas: null,
              habilitado: true,
              descripcionUso: null,
              contiguos: [],
              camposEditables: [],
            },
            {
              id: 'e2',
              identificador: 'LAB-301',
              tipo: 'LABORATORIO',
              pabellon: 'B',
              piso: 3,
              aforoNominal: 30,
              softwareInstalado: [{ id: 's1', nombre: 'MATLAB', version: 'R2024a' }],
              pcsMalogradas: 3,
              habilitado: false,
              descripcionUso: 'Sala de investigación conmobilidad reducida',
              contiguos: ['e1'],
              camposEditables: ['aforoNominal'],
            },
          ],
        }),
      });
    });
    await page.route('**/api/v1/admin/alertas**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      }),
    );
    await page.route('**/api/v1/admin/secciones-escaladas**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { periodo: '2026-II', total: 0, secciones: [] } }),
      }),
    );
    await page.route('**/api/v1/admin/laboratorios**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      }),
    );
    await page.route('**/api/v1/admin/software**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [], total: 0, page: 1, limit: 100 } }),
      }),
    );

    await page.setViewportSize({ width: ANCHO, height: 800 });
    await page.goto('/login/admin');
    await page.locator('#login-identificador').fill('coordinacion');
    await page.locator('#login-clave').fill('clave');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/admin/);

    for (const p of PANTALLAS) {
      await page.goto(p.ruta);
      await page.waitForTimeout(600);
      const info = await page.evaluate((ancho) => {
        const doc = document.documentElement;
        const culpables: string[] = [];
        document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return;
          if (r.right > ancho + 1) {
            culpables.push(
              `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 3).join('.')} right=${Math.round(r.right)} w=${Math.round(r.width)}`,
            );
          }
        });
        return {
          scrollWidth: doc.scrollWidth,
          innerWidth: window.innerWidth,
          culpables: culpables.slice(0, 8),
        };
      }, ANCHO);
      // eslint-disable-next-line no-console
      console.log(`\n### ${p.nombre} (${p.ruta}) scrollWidth=${info.scrollWidth} inner=${info.innerWidth}`);
      info.culpables.forEach((c) => console.log('   - ' + c));
    }
  });
});
