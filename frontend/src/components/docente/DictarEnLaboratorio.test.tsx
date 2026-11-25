import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DictarEnLaboratorio from './DictarEnLaboratorio';
import { ProveedorAvisos } from '../ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  crearSolicitudLaboratorio,
  obtenerMisSolicitudesLaboratorio,
} from '../../services/fusionLaboratorio';
import type { HorarioSemanalDTO, SesionDTO } from '../../types/horario';
import { solicitudLaboratorio } from '../../test/fixtures/fusionLaboratorio';

vi.mock('../../services/fusionLaboratorio', () => ({
  obtenerMisSolicitudesLaboratorio: vi.fn(),
  crearSolicitudLaboratorio: vi.fn(),
}));

const listar = vi.mocked(obtenerMisSolicitudesLaboratorio);
const crear = vi.mocked(crearSolicitudLaboratorio);

const sesion = (o: Partial<SesionDTO>): SesionDTO => ({
  seccionId: 'sec-teo',
  codigoCurso: '202SW0805',
  nombreCurso: 'Gestión de la Configuración',
  codigoSeccion: '2',
  tipoEspacioRequerido: 'AULA_TEORICA',
  docenteNombre: 'Dra. Rojas',
  diaSemana: 'JUEVES',
  horaInicio: '18:00',
  horaFin: '20:00',
  espacios: [],
  estadoAsignacion: 'VIGENTE',
  ...o,
});

const horario: HorarioSemanalDTO = {
  periodo: '2026-2',
  vista: 'semana',
  dias: {
    JUEVES: [
      sesion({}),
      sesion({
        seccionId: 'sec-lab',
        codigoSeccion: '2-LAB',
        tipoEspacioRequerido: 'LABORATORIO',
        horaInicio: '20:00',
        horaFin: '22:00',
      }),
    ],
    // Una teoría sin laboratorio en su grupo no se puede pedir.
    LUNES: [sesion({ seccionId: 'sec-otra', codigoCurso: 'IS101', codigoSeccion: '1' })],
  },
};

const montar = (h: HorarioSemanalDTO = horario) =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <DictarEnLaboratorio horario={h} />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Dictar todo en laboratorio: portal docente (Issue 7.17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    listar.mockResolvedValue([]);
  });

  it('solo ofrece las secciones de teoría con laboratorio y envía la solicitud', async () => {
    crear.mockResolvedValue(solicitudLaboratorio());
    montar();

    const select = await screen.findByLabelText('Sección de teoría');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Elige una sección…',
      '202SW0805 · Grupo 2 — Gestión de la Configuración',
    ]);

    fireEvent.change(select, { target: { value: 'sec-teo' } });
    expect(
      screen.getByText('Todo en laboratorio: Jueves 18:00 – 20:00, Jueves 20:00 – 22:00'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Por qué necesitas/), {
      target: { value: 'Toda la práctica es en las PCs' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        seccionTeoriaId: 'sec-teo',
        justificacion: 'Toda la práctica es en las PCs',
      }),
    );
  });

  it('exige elegir la sección y una justificación', async () => {
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud' }));
    expect(screen.getByText('Elige la sección de teoría.')).toBeInTheDocument();
    expect(screen.getByText(/al menos 10 caracteres/)).toBeInTheDocument();
    expect(crear).not.toHaveBeenCalled();
  });

  it('lista sus solicitudes con el motivo del rechazo', async () => {
    listar.mockResolvedValue([
      solicitudLaboratorio({ estado: 'RECHAZADA', motivoRechazo: 'No hay laboratorio libre' }),
    ]);
    montar();
    expect(
      await screen.findByText(/Coordinación la rechazó: No hay laboratorio libre/),
    ).toBeInTheDocument();
    expect(screen.getByText('Rechazada')).toBeInTheDocument();
  });

  it('con una pendiente para la única sección posible, no ofrece otra', async () => {
    listar.mockResolvedValue([solicitudLaboratorio()]);
    montar();
    expect(await screen.findByText(/Ya enviaste una solicitud/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Sección de teoría')).toBeNull();
  });

  it('sin teoría con laboratorio explica qué hacer', async () => {
    montar({ periodo: '2026-2', vista: 'semana', dias: { LUNES: [sesion({})] } });
    expect(await screen.findByText(/Ninguna de tus secciones de teoría/)).toBeInTheDocument();
  });
});
