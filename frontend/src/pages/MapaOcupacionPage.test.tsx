import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapaOcupacionPage from './MapaOcupacionPage';
import * as servicio from '../services/estudiante';
import type { CursoMatriculadoDTO } from '../types/horario';
import type { MapaOcupacionLecturaDTO } from '../types/ruta';

vi.mock('../components/mapa3d/Mapa3DLazy', () => ({
  default: () => <div data-testid="mapa-3d" />,
}));

const ESPACIO = {
  id: 'e1',
  identificador: 'NUE-201',
  tipo: 'AULA_TEORICA' as const,
  pabellon: 'Nuevo',
  piso: 2,
};

const CURSO = {
  asignacionId: 'a1',
  codigoCurso: 'CC-101',
  nombreCurso: 'Algoritmos',
  codigoSeccion: '1',
  periodo: '2026-II',
  docenteNombre: null,
  horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
  estadoAsignacion: 'VIGENTE',
  espacios: [ESPACIO],
  proximaSesion: null,
} satisfies CursoMatriculadoDTO;

const MAPA: MapaOcupacionLecturaDTO = {
  pabellon: 'Nuevo',
  piso: 2,
  franja: { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
  espacios: [
    { id: 'e1', identificador: 'NUE-201', tipo: 'AULA_TEORICA', estado: 'OCUPADO' },
    { id: 'e2', identificador: 'Lab 01', tipo: 'LABORATORIO', estado: 'DISPONIBLE' },
  ],
};

const renderizar = () =>
  render(
    <MemoryRouter>
      <MapaOcupacionPage />
    </MemoryRouter>,
  );

describe('MapaOcupacionPage (Issue 3.13)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('muestra el piso de las clases del alumno con cada espacio libre u ocupado', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    const espia = vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue(MAPA);
    renderizar();

    expect(await screen.findByText('Lunes, 08:00 a 10:00')).toBeVisible();
    expect(espia).toHaveBeenCalledWith({ pabellon: 'Nuevo', piso: 2, franja: undefined });
    expect(screen.getByTestId('contador-libres')).toHaveTextContent('1');
    expect(screen.getByTestId('contador-ocupados')).toHaveTextContent('1');
    expect(screen.getByTestId('contador-tus clases aquí')).toHaveTextContent('1');
    // El plano 2D es la vista por defecto y marca el salón del alumno.
    const plano = screen.getByTestId('plano-2d');
    expect(plano.querySelector('[id="NUE-201"]')).toHaveClass('plano2d-mia');
    expect(screen.queryByTestId('mapa-3d')).not.toBeInTheDocument();
  });

  it('al tocar un espacio de la lista muestra su detalle y cómo llegar a la clase', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue(MAPA);
    renderizar();
    await screen.findByText('Lunes, 08:00 a 10:00');
    expect(screen.getByText(/Toca un espacio del plano/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /NUE-201/ }));

    const detalle = screen.getByRole('region', { name: 'Detalle de NUE-201' });
    expect(detalle).toHaveTextContent('Ocupado');
    expect(detalle).toHaveTextContent('Tienes clase aquí en esta franja');
    expect(detalle).toHaveTextContent('Algoritmos');
    expect(screen.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute(
      'href',
      '/estudiante/ruta/a1',
    );
  });

  it('tocar un espacio en el plano lo selecciona', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue(MAPA);
    renderizar();
    await screen.findByText('Lunes, 08:00 a 10:00');

    const figura = screen.getByTestId('plano-2d').querySelector('[id="NUE-lab-01"]');
    expect(figura).not.toBeNull();
    fireEvent.click(figura as Element);

    const detalle = screen.getByRole('region', { name: 'Detalle de Lab 01' });
    expect(detalle).toHaveTextContent('Libre');
    expect(detalle).not.toHaveTextContent('Tienes clase aquí en esta franja');
  });

  it('filtra la lista por libres y ocupados', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue(MAPA);
    renderizar();
    await screen.findByText('Lunes, 08:00 a 10:00');

    fireEvent.click(screen.getByRole('button', { name: /^Libres/ }));
    expect(screen.queryByRole('button', { name: /NUE-201/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lab 01/ })).toBeVisible();
  });

  it('permite cambiar a la maqueta 3D', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue(MAPA);
    renderizar();
    await screen.findByText('Lunes, 08:00 a 10:00');

    fireEvent.click(screen.getByRole('button', { name: 'Maqueta 3D' }));
    expect(screen.getByTestId('mapa-3d')).toBeInTheDocument();
    expect(screen.queryByTestId('plano-2d')).not.toBeInTheDocument();
  });

  it('pide la franja elegida cuando se elige «Otro día u hora»', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    const espia = vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue(MAPA);
    renderizar();
    await screen.findByText('Lunes, 08:00 a 10:00');

    fireEvent.click(screen.getByRole('button', { name: 'Otro día u hora' }));
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: 'MARTES' } });

    await waitFor(() =>
      expect(espia).toHaveBeenLastCalledWith({
        pabellon: 'Nuevo',
        piso: 2,
        franja: { dia: 'MARTES', horaInicio: '08:00', horaFin: '10:00' },
      }),
    );
  });

  it('no consulta si la hora de fin no es posterior a la de inicio', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    const espia = vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue(MAPA);
    renderizar();
    await screen.findByText('Lunes, 08:00 a 10:00');

    fireEvent.click(screen.getByRole('button', { name: 'Otro día u hora' }));
    await screen.findByText('Lunes, 08:00 a 10:00');
    espia.mockClear();
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '08:00' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/posterior a la de inicio/);
    expect(espia).not.toHaveBeenCalled();
  });

  it('un domingo (sin clases) no marca ningún espacio como «tu aula»', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue({
      ...MAPA,
      franja: { diaSemana: 'DOMINGO', horaInicio: '17:17', horaFin: '17:18' },
      espacios: MAPA.espacios.map((e) => ({ ...e, estado: 'DISPONIBLE' as const })),
    });
    renderizar();

    expect(await screen.findByText('Domingo, 17:17 a 17:18')).toBeVisible();
    expect(screen.getByTestId('contador-tus clases aquí')).toHaveTextContent('0');
    expect(screen.getByText(/No tienes clases en este piso en esta franja/)).toBeVisible();
    const plano = screen.getByTestId('plano-2d');
    expect(plano.querySelector('[id="NUE-201"]')).not.toHaveClass('plano2d-mia');
    expect(screen.queryByRole('button', { name: /^Mis clases/ })).not.toBeInTheDocument();
  });

  it('marca «tu aula» solo si la franja consultada se cruza con tu clase', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({ periodo: '2026-II', cursos: [CURSO] });
    vi.spyOn(servicio, 'obtenerMapaOcupacion').mockResolvedValue({
      ...MAPA,
      franja: { diaSemana: 'LUNES', horaInicio: '12:00', horaFin: '13:00' },
    });
    renderizar();

    await screen.findByText('Lunes, 12:00 a 13:00');
    expect(screen.getByTestId('contador-tus clases aquí')).toHaveTextContent('0');
  });

  it('sin cursos con espacio asignado explica que aún no hay piso para mostrar', async () => {
    vi.spyOn(servicio, 'obtenerCursos').mockResolvedValue({
      periodo: '2026-II',
      cursos: [{ ...CURSO, espacios: [], estadoAsignacion: 'PENDIENTE' }],
    });
    renderizar();

    expect(await screen.findByText('Aún no hay un piso para mostrar')).toBeVisible();
  });
});
