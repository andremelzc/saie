import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import HorarioDia from './HorarioDia';
import type { HorarioSemanalDTO, SesionDTO } from '../../types/horario';

const sesion = (o: Partial<SesionDTO>): SesionDTO => ({
  seccionId: 's-teo',
  codigoCurso: '202SW0805',
  nombreCurso: 'Gestión de la Configuración',
  codigoSeccion: '2',
  tipoEspacioRequerido: 'AULA_TEORICA',
  docenteNombre: 'Dra. García',
  diaSemana: 'JUEVES',
  horaInicio: '18:00',
  horaFin: '20:00',
  espacios: [
    { id: 'a105', identificador: '105', tipo: 'AULA_TEORICA', pabellon: 'Antiguo', piso: 1 },
  ],
  estadoAsignacion: 'VIGENTE',
  ...o,
});

const horario: HorarioSemanalDTO = {
  periodo: '2026-2',
  vista: 'dia',
  dias: {
    JUEVES: [
      sesion({}),
      sesion({
        seccionId: 's-lab',
        codigoSeccion: '2-LAB',
        tipoEspacioRequerido: 'LABORATORIO',
        horaInicio: '20:00',
        horaFin: '22:00',
        espacios: [
          { id: 'l01', identificador: 'L-01', tipo: 'LABORATORIO', pabellon: 'Nuevo', piso: 2 },
        ],
      }),
    ],
  },
};

describe('HorarioDia (Issue 3.62)', () => {
  it('agrupa teoría y laboratorio del mismo curso y grupo y rotula cada clase', () => {
    render(
      <HorarioDia
        horario={horario}
        colores={{}}
        dia="JUEVES"
        onCambiarDia={vi.fn()}
        hoy="LUNES"
        ahoraEnMinutos={600}
      />,
    );

    const cursos = screen.getAllByRole('heading', { level: 4 });
    expect(cursos).toHaveLength(1);
    expect(cursos[0]).toHaveTextContent('Gestión de la Configuración');
    expect(screen.getByText('202SW0805 · Grupo 2')).toBeInTheDocument();

    const tipos = screen.getAllByRole('heading', { level: 5 }).map((h) => h.textContent);
    expect(tipos).toEqual(['Teoría', 'Laboratorio']);

    const tarjeta = cursos[0].closest('li') as HTMLElement;
    expect(within(tarjeta).getByText('18:00')).toBeInTheDocument();
    expect(within(tarjeta).getByText('20:00', { selector: 'p.font-bold' })).toBeInTheDocument();
    expect(screen.queryByText(/2-LAB/)).toBeNull();
  });
});
