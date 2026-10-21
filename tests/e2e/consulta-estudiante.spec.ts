import { test, expect } from '@playwright/test';

test.describe('Flujo de Consulta Pública del Estudiante (Issue #181 / 5.9)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepción de API para pruebas E2E deterministas y reproducibles
    await page.route('**/api/v1/consulta/alumno/20200001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            alumno: {
              codigo: '20200001',
              nombre: 'Juan Pérez García',
              correo: 'juan.perez@unmsm.edu.pe',
              movilidadReducida: false,
            },
            asignaciones: [
              {
                asignacionId: 'asig-001',
                codigoCurso: 'CC-101',
                nombreCurso: 'Introducción a la Computación',
                codigoSeccion: '1',
                periodo: '2026-1',
                docenteNombre: 'Dr. Roberto Torres',
                horarios: [
                  {
                    diaSemana: 'LUNES',
                    horaInicio: '08:00',
                    horaFin: '10:00',
                  },
                ],
                espacios: [
                  {
                    id: 'esp-101',
                    identificador: 'Aula 101',
                    tipo: 'AULA_TEORICA',
                    pabellon: 'A',
                    piso: 1,
                  },
                ],
                estadoAsignacion: 'VIGENTE',
                motivoEscalamiento: null,
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/v1/consulta/alumno/20200002', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            alumno: {
              codigo: '20200002',
              nombre: 'Carlos Mendoza',
              correo: 'carlos.mendoza@unmsm.edu.pe',
              movilidadReducida: false,
            },
            asignaciones: [],
          },
        }),
      });
    });

    await page.route('**/api/v1/consulta/alumno/99999999', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'No se encontró ningún estudiante con el código 99999999',
        }),
      });
    });

    await page.route('**/api/v1/consulta/curso/CC-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            curso: {
              codigo: 'CC-101',
              nombre: 'Introducción a la Computación',
            },
            secciones: [
              {
                seccionId: 'sec-101',
                codigoSeccion: '1',
                periodo: '2026-1',
                docenteNombre: 'Dr. Roberto Torres',
                horarios: [
                  {
                    diaSemana: 'LUNES',
                    horaInicio: '08:00',
                    horaFin: '10:00',
                  },
                ],
                espacios: [
                  {
                    id: 'esp-101',
                    identificador: 'Aula 101',
                    tipo: 'AULA_TEORICA',
                    pabellon: 'A',
                    piso: 1,
                  },
                ],
                estadoAsignacion: 'VIGENTE',
                motivoEscalamiento: null,
              },
            ],
          },
        }),
      });
    });
  });

  test('Navegación desde Home hacia la vista de Consulta pública (Issue 3.7)', async ({ page }) => {
    await page.goto('/');

    const enlaceConsulta = page.getByTestId('enlace-consulta');
    await expect(enlaceConsulta).toBeVisible();
    await enlaceConsulta.click();

    await expect(page).toHaveURL(/\/consulta$/);
    await expect(page.getByRole('heading', { name: 'Consulta de espacios' })).toBeVisible();
    await expect(page.getByPlaceholder('Ej. 20200001 o CC-101')).toBeVisible();
  });

  test('Caso Feliz: consulta de estudiante con asignación vigente muestra tarjeta con aula, pabellón y horario', async ({
    page,
  }) => {
    await page.goto('/consulta');

    const inputCodigo = page.locator('#codigo-consulta');
    const botonBuscar = page.getByRole('button', { name: 'Buscar' });

    // El botón ya no se deshabilita con el campo vacío: la validación se muestra al enviar,
    // para que el mensaje de error sea visible y no dependa de un atributo `disabled`.
    await expect(botonBuscar).toBeEnabled();

    // Escribir código válido de 8 dígitos
    await inputCodigo.fill('20200001');

    // Debe detectar automáticamente el tipo como Estudiante
    await expect(page.getByText('Estudiante detectado')).toBeVisible();
    await expect(botonBuscar).toBeEnabled();

    // Enviar formulario
    await botonBuscar.click();

    // Verificar visualización de resultados
    await expect(page.getByRole('heading', { name: 'Tus clases' })).toBeVisible();
    await expect(page.getByText(/1 clase encontrada para el código 20200001/i)).toBeVisible();
    await expect(page.getByText('Introducción a la Computación')).toBeVisible();
    await expect(page.getByText('Aula 101')).toBeVisible();
    await expect(page.getByText('Aula teórica')).toBeVisible();
    await expect(page.getByText('Piso 1')).toBeVisible();
    await expect(page.getByText('Dr. Roberto Torres')).toBeVisible();
  });

  test('Caso Estudiante sin clases: muestra mensaje informativo sin romper la vista', async ({
    page,
  }) => {
    await page.goto('/consulta');

    const inputCodigo = page.locator('#codigo-consulta');
    await inputCodigo.fill('20200002');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(
      page.getByText('El código 20200002 no tiene clases asignadas por ahora.'),
    ).toBeVisible();
  });

  test('Caso Código Inexistente (404): muestra mensaje de error controlado al usuario', async ({
    page,
  }) => {
    await page.goto('/consulta');

    const inputCodigo = page.locator('#codigo-consulta');
    await inputCodigo.fill('99999999');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(
      page.getByText('No se encontró ningún estudiante con el código 99999999'),
    ).toBeVisible();
  });

  test('Caso Error de Formato: bloquea el envío y muestra mensaje de validación accesible', async ({
    page,
  }) => {
    await page.goto('/consulta');

    const inputCodigo = page.locator('#codigo-consulta');
    const botonBuscar = page.getByRole('button', { name: 'Buscar' });

    // Código inválido (no son 8 dígitos ni formato CURSO-123)
    await inputCodigo.fill('1234');
    await inputCodigo.blur();

    await expect(
      page.getByText('Ingresa 8 dígitos (alumno) o un código de curso como CC-101'),
    ).toBeVisible();
    // El botón sigue disponible: al enviar de nuevo se muestra el error sin consultar al backend.
    await expect(botonBuscar).toBeEnabled();
  });

  test('Caso Código vacío: avisa al enviar sin consultar al backend', async ({ page }) => {
    await page.goto('/consulta');

    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(
      page.getByText('Escribe tu código de alumno o el código de un curso.'),
    ).toBeVisible();
  });

  test('Caso Consulta por Código de Curso (Issue 3.4)', async ({ page }) => {
    await page.goto('/consulta');

    const inputCodigo = page.locator('#codigo-consulta');
    await inputCodigo.fill('CC-101');

    await expect(page.getByText('Curso detectado')).toBeVisible();
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(
      page.getByRole('heading', { name: /CC-101 · Introducción a la Computación/i }),
    ).toBeVisible();
    await expect(page.getByText(/1 sección encontrada/i)).toBeVisible();
  });

  test('Permite retornar a la página de inicio mediante el botón de retorno', async ({ page }) => {
    await page.goto('/consulta');

    const enlaceVolver = page.getByRole('link', { name: /Volver al inicio/i });
    await expect(enlaceVolver).toBeVisible();
    await enlaceVolver.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Bienvenido a SAIE' })).toBeVisible();
  });
});
