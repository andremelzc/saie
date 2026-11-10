import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import GridHorarioSemanal from './GridHorarioSemanal';
import type { HorarioSemanalDTO, SesionDTO } from '../../types/horario';
import { rangoDeHorario } from '../../utils/horario';

const sesion = (o: Partial<SesionDTO>): SesionDTO => ({
  seccionId: 's1',
  codigoCurso: 'IS101',
  nombreCurso: 'Algoritmos',
  codigoSeccion: '1',
  docenteNombre: 'Dra. García',
  diaSemana: 'LUNES',
  horaInicio: '10:00',
  horaFin: '10:50',
  espacios: [
    { id: 'e1', identificador: 'Lab 04', tipo: 'LABORATORIO', pabellon: 'Nuevo', piso: 2 },
  ],
  estadoAsignacion: 'VIGENTE',
  ...o,
});

const horario: HorarioSemanalDTO = {
  periodo: '2026-2',
  vista: 'semana',
  dias: {
    LUNES: [sesion({})],
    MIERCOLES: [
      sesion({ seccionId: 's2', diaSemana: 'MIERCOLES', horaInicio: '14:00', horaFin: '16:00' }),
    ],
  },
};

describe('GridHorarioSemanal (Issue 3.39)', () => {
  it('ajusta el rango de horas a las clases', () => {
    expect(rangoDeHorario(horario)).toEqual({ desde: 10, hasta: 16 });
    expect(rangoDeHorario({ ...horario, dias: {} })).toEqual({ desde: 8, hasta: 22 });
    render(<GridHorarioSemanal horario={horario} colores={{}} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.queryByText('08:00')).toBeNull();
  });

  it('la región con scroll se alcanza con el teclado', () => {
    render(<GridHorarioSemanal horario={horario} colores={{}} />);
    expect(
      screen.getByRole('region', { name: 'Horario semanal de lunes a sábado' }),
    ).toHaveAttribute('tabindex', '0');
  });

  it('cada bloque es un botón que abre todos sus datos en un drawer', async () => {
    render(<GridHorarioSemanal horario={horario} colores={{}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /IS101 · Sec\. 1.*Algoritmos/ })[0]);

    const dialogo = await screen.findByRole('dialog', { name: /^Algoritmos/ });
    expect(within(dialogo).getByText('Dra. García')).toBeInTheDocument();
    expect(
      within(dialogo).getByText(/Laboratorio Lab 04 · Pabellón Nuevo, piso 2/),
    ).toBeInTheDocument();
    expect(within(dialogo).getByText('Lunes, 10:00 – 10:50')).toBeInTheDocument();
  });
});
