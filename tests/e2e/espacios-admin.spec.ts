import { test, expect } from '@playwright/test';

/**
 * Flujo de espacios del panel administrativo (Issue 4.15).
 *
 * El spec no necesita backend ni base de datos: el login y las llamadas al panel se interceptan
 * con `page.route` (igual que en `consulta-estudiante.spec.ts`), de modo que el flujo se puede
 * ejecutar en el CI y en local con solo el frontend de desarrollo.
 *
 * Lo que se comprueba: entrar al panel como Coordinación, abrir un espacio, editar su aforo,
 * guardar y verificar el aviso de éxito y la fila actualizada.
 */

const ESPACIO = {
  id: 'e1',
  identificador: 'AULA-101',
  tipo: 'AULA_TEORICA',
  pabellon: 'A',
  piso: 1,
  aforoNominal: 40,
  softwareInstalado: null,
  pcsMalogradas: null,
  habilitado: true,
  descripcionUso: null,
  contiguos: [],
  camposEditables: [
    'identificador',
    'pabellon',
    'piso',
    'aforoNominal',
    'contiguos',
    'habilitado',
    'descripcionUso',
  ],
};

/** JWT sin firma, suficiente para que el frontend lo considere vigente. */
function tokenDePrueba(rol: string, horasValidez = 8): string {
  const base64url = (objeto: object) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
  const cabecera = base64url({ alg: 'HS256', typ: 'JWT' });
  const cuerpo = base64url({
    rol,
    sub: '1',
    exp: Math.floor(Date.now() / 1000) + horasValidez * 3600,
  });
  return `${cabecera}.${cuerpo}.firma`;
}

test.describe('Gestión de espacios del panel (Issue 4.15)', () => {
  // El estado del backend simulado: el aforo cambia cuando se guarda.
  let aforo = ESPACIO.aforoNominal;

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/admin/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: tokenDePrueba('COORDINACION_ACADEMICA'),
            rol: 'COORDINACION_ACADEMICA',
            debeCambiarClave: false,
            expiresIn: '8h',
          },
        }),
      });
    });

    await page.route('**/api/v1/admin/espacios**', async (route, request) => {
      if (request.method() === 'PATCH') {
        const cambios = JSON.parse(request.postData() ?? '{}') as { aforoNominal?: number };
        if (typeof cambios.aforoNominal === 'number') aforo = cambios.aforoNominal;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { espacio: { ...ESPACIO, aforoNominal: aforo }, alertas: [] },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ ...ESPACIO, aforoNominal: aforo }],
        }),
      });
    });

    // Catálogo de software y consultas del inicio: el panel los pide al entrar.
    await page.route('**/api/v1/admin/software**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, limit: 100 },
        }),
      });
    });
    await page.route('**/api/v1/admin/alertas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
    await page.route('**/api/v1/admin/secciones-escaladas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { periodo: '2026-II', total: 0, secciones: [] },
        }),
      });
    });
  });

  test('entra al panel como Coordinación y ve el listado de espacios', async ({ page }) => {
    await page.goto('/login/admin');

    await page.locator('#login-identificador').fill('coordinacion');
    await page.locator('#login-clave').fill('clave-de-prueba');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Coordinación Académica').first()).toBeVisible();

    await page.goto('/admin/espacios');
    await expect(page.getByRole('heading', { name: 'Espacios' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'AULA-101', exact: true })).toBeVisible();
  });

  test('edita el aforo de un espacio, guarda y comprueba el aviso y la fila', async ({ page }) => {
    await page.goto('/login/admin');
    await page.locator('#login-identificador').fill('coordinacion');
    await page.locator('#login-clave').fill('clave-de-prueba');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/admin/);

    await page.goto('/admin/espacios');
    const fila = page.getByRole('row', { name: /AULA-101/ });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('40');

    // Abrir el detalle del espacio y pasar al formulario de edición.
    await page.getByRole('button', { name: 'Ver detalle de AULA-101' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Editar espacio' }).click();

    // Cambiar la capacidad y guardar.
    await drawer.locator('#espacio-aforo').fill('45');
    await drawer.getByRole('button', { name: 'Guardar cambios' }).click();

    // Aviso de éxito (toast) y fila actualizada.
    await expect(page.getByText('Espacio AULA-101 actualizado.')).toBeVisible();
    await drawer.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('row', { name: /AULA-101/ })).toContainText('45');
  });
});
