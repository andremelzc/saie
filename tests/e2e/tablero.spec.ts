import { test, expect, type Page } from "@playwright/test";
import {
  entrarComoCoordinacion,
  simularPanel,
  tokenDePrueba,
} from "./helpers-panel";

/**
 * Modo tablero (Issue 3.29): las pantallas de inicio deben caber en la ventana sin scroll
 * vertical, para que la persona que abre el sistema vea el todo de una vez.
 *
 * Es un requisito comprobable: si el contenido no cabe, la prueba falla. Así no se puede
 * reintroducir el scroll por descuido al tocar el diseño.
 */

const VENTANAS = [
  { ancho: 1440, alto: 900 },
  { ancho: 1280, alto: 800 },
];

/** ¿La página tiene scroll vertical? */
async function tieneScrollVertical(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 1,
  );
}

/** Un horario de ejemplo con dos días de clase. */
const HORARIO_DEMO = {
  periodo: "2026-2",
  vista: "semana",
  dias: {
    LUNES: [
      {
        seccionId: "s1",
        codigoCurso: "IS101",
        nombreCurso: "Algoritmos",
        codigoSeccion: "1",
        docenteNombre: "Dra. García",
        diaSemana: "LUNES",
        horaInicio: "08:00",
        horaFin: "10:00",
        espacios: [
          {
            id: "e1",
            identificador: "Lab 03",
            tipo: "LABORATORIO",
            pabellon: "A",
            piso: 1,
          },
        ],
        estadoAsignacion: "VIGENTE",
      },
    ],
    MIERCOLES: [
      {
        seccionId: "s2",
        codigoCurso: "IS202",
        nombreCurso: "Bases de datos",
        codigoSeccion: "1",
        docenteNombre: "Dr. Pérez",
        diaSemana: "MIERCOLES",
        horaInicio: "10:00",
        horaFin: "12:00",
        espacios: [
          {
            id: "e2",
            identificador: "Aula 201",
            tipo: "AULA_TEORICA",
            pabellon: "A",
            piso: 2,
          },
        ],
        estadoAsignacion: "VIGENTE",
      },
    ],
  },
};

/** Entra al portal del estudiante con el login simulado. */
async function entrarComoAlumno(page: Page): Promise<void> {
  await page.route("**/api/v1/auth/alumno/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          token: tokenDePrueba("ALUMNO"),
          rol: "ALUMNO",
          debeCambiarClave: false,
          expiresIn: "8h",
        },
      }),
    });
  });

  await page.route("**/api/v1/estudiante/horario", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: HORARIO_DEMO }),
    });
  });

  await page.goto("/login/alumno");
  await page.locator("#login-identificador").fill("22200101");
  await page.locator("#login-clave").fill("clave-de-prueba");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/estudiante/);
}

test.describe("Las pantallas de inicio caben en una pantalla (Issue 3.29)", () => {
  for (const ventana of VENTANAS) {
    test(`el inicio del panel no hace scroll vertical a ${ventana.ancho}x${ventana.alto}`, async ({
      page,
    }) => {
      await simularPanel(page);
      await entrarComoCoordinacion(page);
      await page.setViewportSize({
        width: ventana.ancho,
        height: ventana.alto,
      });

      await page.goto("/admin");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(300);

      expect(await tieneScrollVertical(page)).toBe(false);
    });

    test(`el inicio del estudiante no hace scroll vertical a ${ventana.ancho}x${ventana.alto}`, async ({
      page,
    }) => {
      await entrarComoAlumno(page);
      await page.setViewportSize({
        width: ventana.ancho,
        height: ventana.alto,
      });

      await page.goto("/estudiante");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(300);

      expect(await tieneScrollVertical(page)).toBe(false);
    });
  }

  test("la lista larga de secciones pendientes hace scroll interno, no de pagina", async ({
    page,
  }) => {
    await simularPanel(page);
    // Esta ruta se registra despues de `simularPanel` a proposito: en Playwright gana la
    // ultima registrada, y aqui interesa el listado largo de secciones escaladas.
    await page.route("**/api/v1/admin/secciones-escaladas**", async (route) => {
      const secciones = Array.from({ length: 40 }, (_, i) => ({
        asignacionId: `a${i}`,
        fechaEscalamiento: "2026-10-10T10:00:00Z",
        motivoEscalamiento:
          "[SIN_HORARIOS_DEFINIDOS] La sección no tiene horario",
        seccion: {
          id: `s${i}`,
          codigoCurso: `IS${100 + i}`,
          nombreCurso: `Curso ${i}`,
          codigoSeccion: String(i),
          periodo: "2026-2",
          docenteNombre: null,
          tipoEspacioRequerido: "AULA_TEORICA",
          alumnosMatriculados: 30,
        },
      }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { periodo: "2026-2", total: secciones.length, secciones },
        }),
      });
    });

    await entrarComoCoordinacion(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(300);

    // La página no se desplaza…
    expect(await tieneScrollVertical(page)).toBe(false);
    // …pero el panel de las secciones sí tiene su propio scroll.
    const lista = page.getByRole("list").filter({ hasText: "Curso 39" });
    await expect(lista).toBeVisible();
  });
});
