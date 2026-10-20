import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const botonDe = (titulo: string) =>
  screen.getByRole('region', { name: titulo }).querySelector('button') as HTMLButtonElement;

describe('Carga de datos maestros (Issue 1.9)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra los tres flujos con el botón deshabilitado hasta elegir un archivo', () => {
    montar();
    for (const t of ['1. Cursos y secciones', '2. Horarios', '3. Matrículas']) {
      expect(botonDe(t)).toBeDisabled();
    }
  });

  it('muestra nombre y tamaño del archivo elegido', () => {
    montar();
    elegirArchivo('horarios');
    expect(screen.getByText('horarios.csv')).toBeInTheDocument();
    expect(screen.getByText(/KB/)).toBeInTheDocument();
    expect(botonDe('2. Horarios')).toBeEnabled();
  });

  it('importa el CSV y muestra el resultado exitoso con los procesados', async () => {
    importar.mockResolvedValue(base);
    montar();
    elegirArchivo('horarios', 'x,y');
    fireEvent.click(botonDe('2. Horarios'));
    expect(await screen.findByText('Importación exitosa: 10 filas.')).toBeInTheDocument();
    expect(importar).toHaveBeenCalledWith('horarios', 'x,y');
    expect(screen.getByText('bloques: 10')).toBeInTheDocument();
  });

  it('lista las filas rechazadas cuando la importación no es exitosa', async () => {
    importar.mockResolvedValue({
      ...base,
      exitosa: false,
      procesados: {},
      errores: ['Fila 2: código inválido', 'Fila 5: falta columna'],
    });
    montar();
    elegirArchivo('matriculas');
    fireEvent.click(botonDe('3. Matrículas'));
    expect(await screen.findByText('2 fila(s) rechazada(s) de 10.')).toBeInTheDocument();
    expect(screen.getByText('Fila 2: código inválido')).toBeInTheDocument();
    expect(screen.getByText('Fila 5: falta columna')).toBeInTheDocument();
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
    fireEvent.click(botonDe('1. Cursos y secciones'));
    expect(
      await screen.findByText('Asignación ejecutada: 4 asignadas, 1 escaladas.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('CONFORME')).toBeInTheDocument();
    expect(screen.getByText('Sin doble reserva')).toBeInTheDocument();
  });

  it('informa el motivo cuando la asignación no se ejecutó', async () => {
    importar.mockResolvedValue({
      ...base,
      asignacion: { disparada: false, motivo: 'Faltan matrículas', resumen: null },
    });
    montar();
    elegirArchivo('horarios');
    fireEvent.click(botonDe('2. Horarios'));
    expect(
      await screen.findByText('Asignación no ejecutada: Faltan matrículas'),
    ).toBeInTheDocument();
  });

  it('muestra el error del servicio y lo limpia al elegir otro archivo', async () => {
    importar.mockRejectedValue(new Error('boom'));
    montar();
    elegirArchivo('horarios');
    fireEvent.click(botonDe('2. Horarios'));
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
    expect(botonDe('2. Horarios')).toBeDisabled();
    expect(importar).not.toHaveBeenCalled();
  });
});
