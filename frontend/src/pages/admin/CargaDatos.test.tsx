import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CargaDatos from './CargaDatos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  importarCsv,
  obtenerUltimasImportaciones,
  obtenerVistaPreviaImportacion,
} from '../../services/admin';
import type { ResultadoImportacionDTO, VistaPreviaImportacionDTO } from '../../types/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  importarCsv: vi.fn(),
  obtenerVistaPreviaImportacion: vi.fn(),
  obtenerUltimasImportaciones: vi.fn(),
}));

const importar = vi.mocked(importarCsv);
const vistaPrevia = vi.mocked(obtenerVistaPreviaImportacion);
const ultimas = vi.mocked(obtenerUltimasImportaciones);

/** Vista previa sin retiros (Issue 1.17): la de la mayoría de las pruebas. */
const VISTA_SIN_RETIROS: VistaPreviaImportacionDTO = {
  tipo: 'horarios',
  filasRecibidas: 10,
  errores: [],
  advertencias: [],
  cambios: { horariosNuevos: 10, horariosActualizados: 0, horariosRetirados: 0 },
  frases: ['Se agregarán 10 franjas de horario', 'Se quitarán 0 franjas que ya no figuran'],
  retiros: [],
};

const base: ResultadoImportacionDTO = {
  tipo: 'horarios',
  filasRecibidas: 10,
  procesados: { bloques: 10 },
  errores: [],
  exitosa: true,
  asignacion: null,
};

function montar() {
  render(
    <MemoryRouter>
      <CargaDatos />
    </MemoryRouter>,
  );
}

function elegirArchivo(tipo: string, contenido = 'a,b\n1,2') {
  const input = document.getElementById(`archivo-${tipo}`) as HTMLInputElement;
  const archivo = new File([contenido], `${tipo}.csv`, { type: 'text/csv' });
  fireEvent.change(input, { target: { files: [archivo] } });
}

const regionDe = (titulo: string) => screen.getByRole('region', { name: titulo });
const botonImportar = (titulo: string) =>
  within(regionDe(titulo)).getByRole('button', { name: 'Importar' });

/** «Importar» abre la vista previa (Issue 1.17); al confirmarla empieza la importación. */
async function importarConfirmando(titulo: string) {
  fireEvent.click(botonImportar(titulo));
  const dialogo = await screen.findByRole('alertdialog', { name: '¿Importar este archivo?' });
  fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar e importar' }));
}

describe('Carga de datos maestros (Issue 1.9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vaciarCacheCarga();
    vistaPrevia.mockResolvedValue(VISTA_SIN_RETIROS);
    // Por defecto el servidor no tiene cargas registradas.
    ultimas.mockResolvedValue({
      'cursos-secciones': null,
      horarios: null,
      matriculas: null,
      docentes: null,
    });
  });

  it('muestra la vista previa con los retiros y no importa si se cancela (Issue 1.17)', async () => {
    vistaPrevia.mockResolvedValue({
      ...VISTA_SIN_RETIROS,
      tipo: 'matriculas',
      frases: ['Se agregarán 12 matrículas', 'Se quitarán 1 matrícula (alumnos que ya no figuran)'],
      retiros: ['CC-101 sec. 1: 20231234 Pedro Ruiz'],
    });
    montar();
    elegirArchivo('matriculas', 'x,y');
    fireEvent.click(botonImportar('3. Matrículas'));

    const dialogo = await screen.findByRole('alertdialog', { name: '¿Importar este archivo?' });
    expect(vistaPrevia).toHaveBeenCalledWith('matriculas', 'x,y');
    expect(within(dialogo).getByText('Se agregarán 12 matrículas.')).toBeInTheDocument();
    expect(within(dialogo).getByText('CC-101 sec. 1: 20231234 Pedro Ruiz')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(importar).not.toHaveBeenCalled();
  });

  it('importa sin pedir confirmación si el archivo tiene errores (Issue 1.17)', async () => {
    vistaPrevia.mockResolvedValue({ ...VISTA_SIN_RETIROS, errores: ['Fila 2: código inválido'] });
    importar.mockResolvedValue({ ...base, exitosa: false, errores: ['Fila 2: código inválido'] });
    montar();
    elegirArchivo('horarios', 'x,y');
    fireEvent.click(botonImportar('2. Horarios'));

    expect(await screen.findByText('La carga tiene 1 fila con problemas')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(importar).toHaveBeenCalledWith('horarios', 'x,y', expect.any(Function));
  });

  it('muestra los cuatro flujos con el botón de importar deshabilitado hasta elegir un archivo', () => {
    montar();
    for (const t of ['1. Cursos y secciones', '2. Horarios', '3. Matrículas', '4. Docentes']) {
      expect(botonImportar(t)).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: 'Guía y plantillas' })).toBeInTheDocument();
  });

  it('si el servidor no responde, usa la última carga del navegador y lo rotula (Issue 4.55)', async () => {
    ultimas.mockRejectedValue(new Error('Network Error'));
    localStorage.setItem(
      'saie.carga.ultima.horarios',
      JSON.stringify({ fecha: '2026-10-10T10:00:00Z', estado: 'con-errores' }),
    );
    // Formato antiguo: solo la fecha, se lee como carga correcta.
    localStorage.setItem('saie.carga.ultima.docentes', '2026-10-09T10:00:00Z');
    montar();

    const horarios = regionDe('2. Horarios');
    expect(await within(horarios).findByText('Con errores')).toBeInTheDocument();
    expect(within(horarios).getByText(/Última carga en este navegador:/)).toBeInTheDocument();
    expect(within(regionDe('4. Docentes')).getByText('Cargado')).toBeInTheDocument();
    // Sin fecha guardada, sí corresponde «Sin cargar» y no hay fecha.
    const cursos = regionDe('1. Cursos y secciones');
    expect(within(cursos).getByText('Sin cargar')).toBeInTheDocument();
    expect(within(cursos).queryByText(/Última carga/)).toBeNull();
  });

  it('toma del servidor la fecha, quién cargó y el resultado de la última carga (Issue 4.55)', async () => {
    // Lo guardado en este navegador no manda: el servidor es la fuente.
    localStorage.setItem('saie.carga.ultima.docentes', '2026-10-09T10:00:00Z');
    ultimas.mockResolvedValue({
      'cursos-secciones': {
        tipo: 'cursos-secciones',
        fecha: '2026-11-24T15:30:00Z',
        cuenta: { id: 'c1', nombre: 'coordinacion' },
        filasRecibidas: 228,
        filasAceptadas: 228,
        filasRechazadas: 0,
        resultado: 'EXITOSA',
      },
      horarios: {
        tipo: 'horarios',
        fecha: '2026-11-24T16:00:00Z',
        cuenta: null,
        filasRecibidas: 5,
        filasAceptadas: 0,
        filasRechazadas: 5,
        resultado: 'CON_ERRORES',
      },
      matriculas: null,
      docentes: null,
    });
    montar();

    const cursos = regionDe('1. Cursos y secciones');
    expect(await within(cursos).findByText('Cargado')).toBeInTheDocument();
    expect(within(cursos).getByText(/^Última carga: .* · coordinacion$/)).toBeInTheDocument();
    const horarios = regionDe('2. Horarios');
    expect(within(horarios).getByText('Con errores')).toBeInTheDocument();
    expect(within(horarios).getByText(/^Última carga: /)).toBeInTheDocument();
    // Docentes nunca se cargó según el servidor: «Sin cargar» y sin fecha.
    const docentes = regionDe('4. Docentes');
    expect(within(docentes).getByText('Sin cargar')).toBeInTheDocument();
    expect(within(docentes).queryByText(/Última carga/)).toBeNull();
    expect(screen.queryByText(/en este navegador/)).toBeNull();
  });

  it('no afirma «Sin cargar» mientras consulta al servidor (Issue 4.55)', () => {
    ultimas.mockReturnValue(new Promise(() => {}));
    montar();
    expect(within(regionDe('1. Cursos y secciones')).getByText('Consultando…')).toBeInTheDocument();
    expect(screen.queryByText('Sin cargar')).toBeNull();
  });

  it('muestra nombre y tamaño del archivo elegido', () => {
    montar();
    elegirArchivo('horarios');
    expect(screen.getByText('horarios.csv')).toBeInTheDocument();
    expect(screen.getByText(/KB/)).toBeInTheDocument();
    expect(botonImportar('2. Horarios')).toBeEnabled();
  });

  it('muestra el avance de una importación grande mientras se procesa (Issue 1.19)', async () => {
    let terminar!: (r: typeof base) => void;
    importar.mockImplementation((_tipo, _csv, onProgreso) => {
      onProgreso?.(2300, 4470);
      return new Promise((resolver) => {
        terminar = resolver;
      });
    });
    montar();
    elegirArchivo('matriculas', 'x,y');
    await importarConfirmando('3. Matrículas');

    expect(await screen.findByText(/Procesando 2300 de 4470 filas/)).toBeInTheDocument();
    terminar(base);
    expect(await screen.findByText('Carga completada sin errores')).toBeInTheDocument();
  });

  it('importa el CSV y muestra el resultado legible con los procesados', async () => {
    importar.mockResolvedValue(base);
    montar();
    elegirArchivo('horarios', 'x,y');
    await importarConfirmando('2. Horarios');

    // En la tarjeta queda el resumen; el detalle (procesados) va en el drawer.
    expect(await screen.findByText('Carga completada sin errores')).toBeInTheDocument();
    expect(importar).toHaveBeenCalledWith('horarios', 'x,y', expect.any(Function));
    expect(screen.getByText('Cargado')).toBeInTheDocument();
    // La procesó el servidor: no es un dato «de este navegador», y se vuelve a consultar.
    expect(within(regionDe('2. Horarios')).getByText(/^Última carga: /)).toBeInTheDocument();
    await waitFor(() => expect(ultimas).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    const dialogo = screen.getByRole('dialog', { name: /Resultado de la carga.*2. Horarios/ });
    expect(within(dialogo).getByText('bloques de horario')).toBeInTheDocument();
    expect(within(dialogo).getByText('10')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lista las filas rechazadas y desactiva la continuación', async () => {
    importar.mockResolvedValue({
      ...base,
      exitosa: false,
      guardadas: false,
      procesados: {},
      errores: ['Fila 2: código inválido', 'Fila 5: falta columna'],
    });
    montar();
    elegirArchivo('matriculas');
    await importarConfirmando('3. Matrículas');

    // La tarjeta solo resume; el detalle de las filas va en el drawer.
    expect(await screen.findByText('La carga tiene 2 filas con problemas')).toBeInTheDocument();
    expect(screen.getByText('Con errores')).toBeInTheDocument();
    // Issue 1.16: «todo o nada», con errores no se guarda ninguna fila.
    expect(screen.getByText(/0 guardadas · 2 con problemas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continuar con/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    const dialogo = screen.getByRole('dialog', { name: /Resultado de la carga.*3. Matrículas/ });
    expect(
      within(dialogo).getByText(/No se guardó ninguna fila porque el archivo tiene filas/),
    ).toBeInTheDocument();
    expect(within(dialogo).getByText('Fila 2: código inválido')).toBeInTheDocument();
    expect(within(dialogo).getByText('Fila 5: falta columna')).toBeInTheDocument();
    expect(
      within(dialogo).getByRole('button', { name: 'Descargar errores (CSV)' }),
    ).toBeInTheDocument();
  });

  it('avisa cuando la carga falló a medias y parte de las filas sí se guardó', async () => {
    importar.mockResolvedValue({
      ...base,
      exitosa: false,
      guardadas: false,
      parcial: true,
      filasRecibidas: 5,
      procesados: { matriculasProcesadas: 4 },
      errores: ['Fila 5: correo duplicado'],
    });
    montar();
    elegirArchivo('matriculas');
    await importarConfirmando('3. Matrículas');

    expect(await screen.findByText(/4 guardadas · 1 con problemas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    const dialogo = screen.getByRole('dialog', { name: /Resultado de la carga.*3. Matrículas/ });
    expect(within(dialogo).getByText(/El archivo falló a medias/)).toBeInTheDocument();
  });

  it('muestra las advertencias de una carga guardada (Issue 1.16)', async () => {
    importar.mockResolvedValue({
      ...base,
      guardadas: true,
      advertencias: ['El docente de C1-1 y C2-1 tendría dos clases a la vez'],
    });
    montar();
    elegirArchivo('horarios');
    await importarConfirmando('2. Horarios');

    expect(await screen.findByText(/1 aviso/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    const dialogo = screen.getByRole('dialog', { name: /Resultado de la carga.*2. Horarios/ });
    expect(
      within(dialogo).getByText('El docente de C1-1 y C2-1 tendría dos clases a la vez'),
    ).toBeInTheDocument();
  });

  it('informa si la asignación se ejecutó tras importar', async () => {
    importar.mockResolvedValue({
      ...base,
      asignacion: {
        disparada: true,
        motivo: null,
        resumen: {
          modo: 'periodo',
          periodo: '2026-II',
          corridaId: 'c1',
          totalSecciones: 5,
          asignadas: 4,
          mantenidas: 0,
          escaladas: 1,
          resultados: [],
          verificacion: {
            conforme: true,
            totalRevisadas: 4,
            totalViolaciones: 0,
            reglas: [
              {
                regla: 'DOBLE_RESERVA',
                descripcion: 'Ningún espacio queda reservado dos veces.',
                revisadas: 4,
                cumplen: 4,
                violaciones: [],
              },
            ],
          },
        },
      },
    });
    montar();
    elegirArchivo('cursos-secciones');
    await importarConfirmando('1. Cursos y secciones');

    // La tarjeta resume la asignación en una línea; el veredicto va en el drawer.
    expect(
      await screen.findByText(
        'Asignación de aulas: 4 secciones con aula nueva, 0 secciones que conservan la suya y 1 sección pendiente de revisión.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    const dialogo = screen.getByRole('dialog', {
      name: /Resultado de la carga.*1. Cursos y secciones/,
    });
    expect(within(dialogo).getByText('Conforme')).toBeInTheDocument();
    expect(within(dialogo).getByText('Sin doble reserva')).toBeInTheDocument();
  });

  it('informa el motivo cuando la asignación no se ejecutó', async () => {
    importar.mockResolvedValue({
      ...base,
      asignacion: { disparada: false, motivo: 'Faltan matrículas', resumen: null },
    });
    montar();
    elegirArchivo('horarios');
    await importarConfirmando('2. Horarios');

    expect(
      await screen.findByText('No se asignaron aulas: Faltan matrículas.'),
    ).toBeInTheDocument();
  });

  it('muestra el error del servicio y lo limpia al elegir otro archivo', async () => {
    importar.mockRejectedValue(new Error('boom'));
    montar();
    elegirArchivo('horarios');
    await importarConfirmando('2. Horarios');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Inténtalo de nuevo en unos minutos.',
    );

    elegirArchivo('horarios');
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('no envía nada si se quita el archivo', () => {
    montar();
    const input = document.getElementById('archivo-horarios') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(botonImportar('2. Horarios')).toBeDisabled();
    expect(importar).not.toHaveBeenCalled();
  });

  it('rechaza archivos que no son CSV antes de llamar al servicio', () => {
    montar();
    const input = document.getElementById('archivo-horarios') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'datos.txt', { type: 'text/plain' })] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('El archivo debe ser un CSV (.csv).');
    expect(botonImportar('2. Horarios')).toBeDisabled();
    expect(importar).not.toHaveBeenCalled();
  });

  it('abre la guía y las plantillas desde el encabezado', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Guía y plantillas' }));

    const dialogo = screen.getByRole('dialog', { name: 'Guía y plantillas' });
    expect(within(dialogo).getByText('¿Cómo funciona la carga?')).toBeInTheDocument();
    expect(within(dialogo).getByText('1. Orden de carga')).toBeInTheDocument();
    expect(within(dialogo).getByText('2. El periodo académico')).toBeInTheDocument();
    // Issue 4.64: el periodo vigente solo cambia desde la pantalla Periodos.
    expect(within(dialogo).getByRole('link', { name: 'Periodos' })).toHaveAttribute(
      'href',
      '/admin/periodos',
    );
    expect(within(dialogo).getByText(/Cargar datos nunca lo cambia/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('tab', { name: 'Plantillas' }));
    expect(
      within(dialogo).getByRole('heading', { name: 'Plantillas de carga' }),
    ).toBeInTheDocument();
    expect(within(dialogo).getByText('Cursos y secciones')).toBeInTheDocument();
    expect(within(dialogo).getByText('Horarios')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ofrece continuar con la siguiente zona y mueve el foco', async () => {
    importar.mockResolvedValue(base);
    montar();
    elegirArchivo('cursos-secciones');
    await importarConfirmando('1. Cursos y secciones');

    const continuar = await screen.findByRole('button', { name: /Continuar con Horarios/ });
    fireEvent.click(continuar);

    expect(screen.getByRole('region', { name: '2. Horarios' })).toHaveFocus();
  });

  it('permite corregir y reintentar tras una carga con errores', async () => {
    importar.mockResolvedValue({
      ...base,
      exitosa: false,
      procesados: {},
      errores: ['Fila 2: código inválido'],
    });
    montar();
    elegirArchivo('matriculas');
    await importarConfirmando('3. Matrículas');
    await screen.findByText('La carga tiene 1 fila con problemas');

    // «Corregir» vive dentro del drawer del detalle: al confirmarlo se cierra y limpia la zona.
    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Corregir y volver a subir' }));

    expect(screen.queryByText(/La carga tiene 1 fila/)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(botonImportar('3. Matrículas')).toBeDisabled();
  });
});
