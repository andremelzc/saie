import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ResumenVerificacion, VeredictoVerificacion } from './VeredictoVerificacion';
import type { ResultadoVerificacionDTO } from '../../types/admin';

const conforme: ResultadoVerificacionDTO = {
  conforme: true,
  totalRevisadas: 12,
  totalViolaciones: 0,
  reglas: [
    {
      regla: 'DOBLE_RESERVA',
      descripcion: 'Ningún espacio queda reservado dos veces.',
      revisadas: 12,
      cumplen: 12,
      violaciones: [],
    },
    {
      regla: 'SOFTWARE_COMPLETO',
      descripcion: 'Los laboratorios tienen todo el software requerido.',
      revisadas: 0,
      cumplen: 0,
      violaciones: [],
    },
  ],
};

const noConforme: ResultadoVerificacionDTO = {
  conforme: false,
  totalRevisadas: 12,
  totalViolaciones: 2,
  reglas: [
    {
      regla: 'CAPACIDAD_SUFICIENTE',
      descripcion: 'El aforo alcanza a los matriculados.',
      revisadas: 12,
      cumplen: 10,
      violaciones: [
        {
          regla: 'CAPACIDAD_SUFICIENTE',
          asignacionId: 'a1',
          seccionId: 's1',
          codigoSeccion: '01',
          detalle: 'Aforo insuficiente para 45 alumnos',
        },
        {
          regla: 'CAPACIDAD_SUFICIENTE',
          asignacionId: 'a2',
          seccionId: 's2',
          codigoSeccion: '02',
          detalle: 'Aforo insuficiente para 40 alumnos',
        },
      ],
    },
  ],
};

describe('VeredictoVerificacion (Issue 2.17)', () => {
  it('avisa cuando no hubo asignaciones que verificar', () => {
    render(<VeredictoVerificacion verificacion={null} />);
    expect(screen.getByText('No hubo asignaciones que verificar en esta corrida.')).toBeTruthy();
  });

  it('muestra el veredicto conforme con el detalle de cada regla', () => {
    render(<VeredictoVerificacion verificacion={conforme} />);

    expect(screen.getByRole('heading', { name: 'Veredicto del verificador' })).toBeTruthy();
    expect(screen.getByText('Todo correcto: se cumplen las 7 reglas.')).toBeTruthy();
    expect(screen.getByText('12 asignaciones revisadas')).toBeTruthy();
    expect(screen.getByText('Sin doble reserva')).toBeTruthy();
    expect(screen.getByText('12/12 cumplen')).toBeTruthy();
    expect(screen.getByText('No aplica')).toBeTruthy();
  });

  it('marca el veredicto no conforme y despliega las violaciones', () => {
    render(<VeredictoVerificacion verificacion={noConforme} />);

    expect(screen.getByText('2 problemas en 1 regla.')).toBeTruthy();
    expect(screen.getByText('10/12 cumplen')).toBeTruthy();

    const detalle = screen
      .getByText(/Ver 2 secciones afectadas/)
      .closest('details') as HTMLDetailsElement;
    expect(detalle.open).toBe(false);
    expect(within(detalle).getByText(/01/)).toBeTruthy();
    expect(within(detalle).getByText(/Aforo insuficiente para 45 alumnos/)).toBeTruthy();
    expect(within(detalle).getByText(/Aforo insuficiente para 40 alumnos/)).toBeTruthy();
  });

  it('resume el veredicto en una línea y abre el detalle bajo demanda', () => {
    render(<ResumenVerificacion verificacion={conforme} />);

    expect(screen.getByText('Verificación correcta · 12 asignaciones · 0 problemas')).toBeTruthy();
    // Las reglas no ocupan la pantalla hasta que se piden.
    expect(screen.queryByText('Sin doble reserva')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }));
    const panel = screen.getByRole('dialog', { name: 'Detalle de la verificación' });
    expect(within(panel).getByText('Sin doble reserva')).toBeTruthy();
  });

  it('el resumen con problemas los cuenta', () => {
    render(<ResumenVerificacion verificacion={noConforme} />);
    expect(
      screen.getByText('Verificación con problemas · 12 asignaciones · 2 problemas'),
    ).toBeTruthy();
  });
});
