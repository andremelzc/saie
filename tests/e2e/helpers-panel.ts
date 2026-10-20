import { expect, type Page } from '@playwright/test';

/**
 * Utilidades compartidas por los E2E del panel administrativo.
 *
 * Los specs no necesitan backend ni base de datos: el login y las consultas al panel se
 * interceptan con `page.route`, de modo que el flujo es determinista y se puede ejecutar en
 * cualquier entorno con el frontend de desarrollo levantado.
 */

export const ESPACIO_DEMO = {
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

export const LABORATORIO_DEMO = {
  ...ESPACIO_DEMO,
  id: 'e2',
  identificador: 'LAB-301',
  tipo: 'LABORATORIO',
  pabellon: 'B',
  piso: 3,
  pcsMalogradas: 3,
  softwareInstalado: [{ id: 's1', nombre: 'MATLAB', version: 'R2024a' }],
  habilitado: false,
};

/** JWT sin firma, suficiente para que el frontend lo considere vigente. */
export function tokenDePrueba(rol: string, horasValidez = 8): string {
  const base64url = (objeto: object) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
  const cabecera = base64url({ alg: 'HS256', typ: 'JWT' });
  const cuerpo = base64url({
    rol,
    sub: '1',
    exp: Math.floor(Date.now() / 1000) + horasValidez * 3600,
  });
  return `${cabecera}.${cuerpo}.firma`;
}

/** Responde a las consultas del panel con datos de ejemplo. */
export async function simularPanel(page: Page): Promise<void> {
  await page.route('**/api/v1/admin/espacios**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [ESPACIO_DEMO, LABORATORIO_DEMO] }),
    });
  });

  await page.route('**/api/v1/admin/alertas**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'a1',
            tipo: 'SOFTWARE',
            estado: 'PENDIENTE',
            motivo: 'Falta MATLAB R2024a',
            fechaDeteccion: '2026-10-10T10:00:00.000Z',
            espacio: { id: 'e2', identificador: 'LAB-301', pabellon: 'B', piso: 3 },
            asignacionesAfectadas: [],
          },
        ],
      }),
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

  await page.route('**/api/v1/admin/laboratorios**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [LABORATORIO_DEMO] }),
    });
  });

  await page.route('**/api/v1/admin/software**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          items: [{ id: 's1', nombre: 'MATLAB', version: 'R2024a', activo: true }],
          total: 1,
          page: 1,
          limit: 100,
        },
      }),
    });
  });
}

/** Entra al panel como Coordinación Académica con el login simulado. */
export async function entrarComoCoordinacion(page: Page): Promise<void> {
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

  await page.goto('/login/admin');
  await page.locator('#login-identificador').fill('coordinacion');
  await page.locator('#login-clave').fill('clave-de-prueba');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/admin/);
}

/**
 * Elementos que se salen del ancho de la ventana. Se usa para comprobar que ninguna pantalla
 * del panel obliga a desplazar la página en horizontal (checklist de densidad de la auditoría).
 */
export async function desbordesHorizontales(page: Page, ancho: number): Promise<string[]> {
  return page.evaluate((limite) => {
    const culpables: string[] = [];
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Se ignoran los contenedores con scroll propio: su contenido puede ser más ancho a
      // propósito, pero la página no se desplaza.
      const tieneScroll = el.scrollWidth > el.clientWidth + 1;
      if (tieneScroll) return;
      if (rect.right > limite + 1) {
        const clase = (el.className || '').toString().split(' ').slice(0, 3).join('.');
        culpables.push(
          `${el.tagName.toLowerCase()}${clase ? `.${clase}` : ''} (right=${Math.round(rect.right)})`,
        );
      }
    });
    return culpables;
  }, ancho);
}
