import { test, expect, type Page } from "@playwright/test";
import { tokenDePrueba } from "./helpers-panel";

/**
 * E2E del marco del área del estudiante (Issue 5.27 / #371).
 *
 * Verifica que logo, insignia de rol y «Cerrar sesión» estén presentes en todas las
 * pantallas del alumno, que no haya scroll horizontal en los breakpoints principales y
 * que la pestaña «Más» muestre las secciones secundarias en móvil.
 */

// ---------------------------------------------------------------------------
// Helpers de sesión de alumno
// ---------------------------------------------------------------------------

/** Rutas que tiene el portal del estudiante para comprobar el marco. */
const RUTAS_ESTUDIANTE = [
  { nombre: "Inicio", ruta: "/estudiante" },
  { nombre: "Horario", ruta: "/estudiante/horario" },
  { nombre: "Perfil", ruta: "/estudiante/perfil" },
  { nombre: "Mapa", ruta: "/estudiante/mapa" },
  { nombre: "Ruta", ruta: "/estudiante/ruta" },
];

/** Anchos en los que se comprueba que no hay scroll horizontal (Issue 5.27). */
const ANCHOS_RESPONSIVE = [390, 768, 1280];

/** Intercepta las API del área del estudiante con datos de prueba estructurados. */
async function simularEstudiante(page: Page): Promise<void> {
  const horarioDemo = {
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
    },
  };

  const perfilDemo = {
    alumno: {
      codigo: "22200101",
      nombre: "Ana Lucía Quispe Ramos",
      correo: "ana.quispe@unmsm.edu.pe",
      dni: "72345678",
      fechaNacimiento: "2003-04-12",
      telefono: "987654321",
      direccion: "Av. Venezuela 3400, Lima",
    },
    fichaMedica: {
      tipoSangre: "O+",
      alergias: "Ninguna",
      condicionEspecial: null,
      contactoEmergencia: "Rosa Ramos · 999888777",
      condicionAccesible: false,
    },
  };

  const cursosDemo = {
    periodo: "2026-2",
    cursos: [
      {
        asignacionId: "asig-1",
        codigoCurso: "IS101",
        nombreCurso: "Algoritmos",
        codigoSeccion: "1",
        docenteNombre: "Dra. García",
        horarios: [
          { diaSemana: "LUNES", horaInicio: "08:00", horaFin: "10:00" },
        ],
        espacios: [
          { id: "e1", identificador: "Lab 03", pabellon: "A", piso: 1 },
        ],
      },
    ],
  };

  const mapaDemo = {
    pabellon: "A",
    piso: 1,
    espacios: [
      {
        id: "e1",
        identificador: "Lab 03",
        tipo: "LABORATORIO",
        pabellon: "A",
        piso: 1,
        aforoNominal: 30,
        estado: "DISPONIBLE",
      },
    ],
  };

  const rutaDemo = {
    asignacionId: "asig-1",
    esAccesible: true,
    espacios: [{ id: "e1", identificador: "Lab 03", pabellon: "A", piso: 1 }],
  };

  await page.route("**/api/v1/estudiante/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/horario")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: horarioDemo }),
      });
    } else if (url.includes("/perfil")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: perfilDemo }),
      });
    } else if (url.includes("/cursos")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: cursosDemo }),
      });
    } else if (url.includes("/mapa-ocupacion")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mapaDemo }),
      });
    } else if (url.includes("/ruta")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: rutaDemo }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    }
  });
}

/** Entra al portal del estudiante con sesión simulada. */
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

  await simularEstudiante(page);

  await page.goto("/login/alumno");
  await page.locator("#login-identificador").fill("22200101");
  await page.locator("#login-clave").fill("clave-de-prueba");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/estudiante/);
}

// ---------------------------------------------------------------------------
// Suite 1: Marco persistente en todas las pantallas del alumno
// ---------------------------------------------------------------------------

test.describe("Marco del alumno — logo, rol y «Cerrar sesión» (Issue 5.27)", () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoAlumno(page);
  });

  for (const pantalla of RUTAS_ESTUDIANTE) {
    test(`${pantalla.nombre}: muestra logo SAIE, insignia de rol y botón de cerrar sesión`, async ({
      page,
    }) => {
      await page.goto(pantalla.ruta);

      // Logo de SAIE visible como imagen (el h1 visible es el título de cada pantalla)
      const logo = page.getByRole("img", { name: "SAIE" });
      await expect(logo).toBeVisible();

      // Insignia de rol (texto visible en la cabecera)
      await expect(page.getByText(/Estudiante/i).first()).toBeVisible();

      // Botón de cierre de sesión accesible en todas las pantallas
      await expect(
        page.getByRole("button", { name: /cerrar sesión/i }),
      ).toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 2: Sin scroll horizontal en los breakpoints del issue (#371)
// ---------------------------------------------------------------------------

test.describe("Sin scroll horizontal en rutas del alumno (Issue 5.27)", () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoAlumno(page);
  });

  for (const ancho of ANCHOS_RESPONSIVE) {
    test(`ninguna pantalla desborda horizontalmente a ${ancho} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: 800 });

      for (const pantalla of RUTAS_ESTUDIANTE) {
        await page.goto(pantalla.ruta);
        await page.waitForTimeout(300);

        const desbordanAlumno = await page.evaluate((limite) => {
          const culpables: string[] = [];
          document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const tieneScrollPropio = el.scrollWidth > el.clientWidth + 1;
            if (tieneScrollPropio) return;
            if (rect.right > limite + 1) {
              const clase = (el.className || "")
                .toString()
                .split(" ")
                .slice(0, 3)
                .join(".");
              culpables.push(
                `${el.tagName.toLowerCase()}${clase ? `.${clase}` : ""} (right=${Math.round(rect.right)})`,
              );
            }
          });
          return culpables;
        }, ancho);

        expect(
          desbordanAlumno,
          `Desborde horizontal en "${pantalla.nombre}" a ${ancho} px`,
        ).toEqual([]);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 3: Pestaña «Más» en móvil — secciones secundarias accesibles
// ---------------------------------------------------------------------------

test.describe("Pestaña «Más» en móvil (Issue 5.27)", () => {
  test.beforeEach(async ({ page }) => {
    await entrarComoAlumno(page);
  });

  test("la pestaña «Más» es visible en móvil (< lg) y oculta en escritorio", async ({
    page,
  }) => {
    // En móvil: la pestaña «Más» debe estar en la barra inferior
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/estudiante");
    const botonMas = page.getByRole("button", { name: /más/i });
    await expect(botonMas).toBeVisible();

    // En escritorio: la pestaña «Más» desaparece (los links secundarios van inline)
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(botonMas).toBeHidden();
  });

  test("«Más» abre el menú con Telegram, Ayuda y Configuración", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/estudiante");

    await page.getByRole("button", { name: /más/i }).click();

    // Los tres ítems secundarios deben aparecer en el menú desplegable
    await expect(page.getByRole("link", { name: /telegram/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /ayuda/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /configuración/i }),
    ).toBeVisible();
  });

  test("«Más» cierra el menú al hacer clic fuera", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/estudiante");

    await page.getByRole("button", { name: /más/i }).click();
    // Verifica que el menú se abrió
    await expect(page.getByRole("link", { name: /telegram/i })).toBeVisible();

    // Clic fuera del menú para cerrarlo
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: /telegram/i })).toBeHidden();
  });
});
