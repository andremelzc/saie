import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CargaDatos from './CargaDatos';
import { importarCsv } from '../../services/admin';
import type { ResultadoImportacionDTO } from '../../types/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({ importarCsv: vi.fn() }));

const importar = vi.mocked(importarCsv);

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

describe('Carga de datos maestros (Issue 1.9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('muestra los cuatro flujos con el botón de importar deshabilitado hasta elegir un archivo', () => {
    montar();
    for (const t of ['1. Cursos y secciones', '2. Horarios', '3. Matrículas', '4. Docentes']) {
      expect(botonImportar(t)).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: 'Guía y plantillas' })).toBeInTheDocument();
  });

  it('muestra nombre y tamaño del archivo elegido', () => {
    montar();
    elegirArchivo('horarios');
    expect(screen.getByText('horarios.csv')).toBeInTheDocument();
    expect(screen.getByText(/KB/)).toBeInTheDocument();
    expect(botonImportar('2. Horarios')).toBeEnabled();
  });

  it('importa el CSV y muestra el resultado legible con los procesados', async () => {
    importar.mockResolvedValue(base);
    montar();
    elegirArchivo('horarios', 'x,y');
    fireEvent.click(botonImportar('2. Horarios'));

    // En la tarjeta queda el resumen; el detalle (procesados) va en el drawer.
    expect(await screen.findByText('Carga completada sin errores')).toBeInTheDocument();
    expect(importar).toHaveBeenCalledWith('horarios', 'x,y');
    expect(screen.getByText('Cargado')).toBeInTheDocument();
    expect(screen.getByText(/Última carga:/)).toBeInTheDocument();

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
      procesados: {},
      errores: ['Fila 2: código inválido', 'Fila 5: falta columna'],
    });
    montar();
    elegirArchivo('matriculas');
    fireEvent.click(botonImportar('3. Matrículas'));

    // La tarjeta solo resume; el detalle de las filas va en el drawer.
    expect(await screen.findByText('La carga tiene 2 filas con problemas')).toBeInTheDocument();
    expect(screen.getByText('Con errores')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continuar con/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    const dialogo = screen.getByRole('dialog', { name: /Resultado de la carga.*3. Matrículas/ });
    expect(
      within(dialogo).getByText(/No se asignaron aulas porque el archivo tiene filas/),
    ).toBeInTheDocument();
    expect(within(dialogo).getByText('Fila 2: código inválido')).toBeInTheDocument();
    expect(within(dialogo).getByText('Fila 5: falta columna')).toBeInTheDocument();
    expect(
      within(dialogo).getByRole('button', { name: 'Descargar errores (CSV)' }),
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
    fireEvent.click(botonImportar('1. Cursos y secciones'));

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
    expect(within(dialogo).getByText('CONFORME')).toBeInTheDocument();
    expect(within(dialogo).getByText('Sin doble reserva')).toBeInTheDocument();
  });

  it('informa el motivo cuando la asignación no se ejecutó', async () => {
    importar.mockResolvedValue({
      ...base,
      asignacion: { disparada: false, motivo: 'Faltan matrículas', resumen: null },
    });
    montar();
    elegirArchivo('horarios');
    fireEvent.click(botonImportar('2. Horarios'));

    expect(
      await screen.findByText('No se asignaron aulas: Faltan matrículas.'),
    ).toBeInTheDocument();
  });

  it('muestra el error del servicio y lo limpia al elegir otro archivo', async () => {
    importar.mockRejectedValue(new Error('boom'));
    montar();
    elegirArchivo('horarios');
    fireEvent.click(botonImportar('2. Horarios'));

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
    fireEvent.click(botonImportar('1. Cursos y secciones'));

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
    fireEvent.click(botonImportar('3. Matrículas'));
    await screen.findByText('La carga tiene 1 fila con problemas');

    // «Corregir» vive dentro del drawer del detalle: al confirmarlo se cierra y limpia la zona.
    fireEvent.click(screen.getByRole('button', { name: 'Ver el resultado completo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Corregir y volver a subir' }));

    expect(screen.queryByText(/La carga tiene 1 fila/)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(botonImportar('3. Matrículas')).toBeDisabled();
  });
});
