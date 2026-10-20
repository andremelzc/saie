import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SeccionesAdmin from './SeccionesAdmin';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import {
  editarSeccion,
  obtenerCatalogoActivo,
  obtenerDocentes,
  obtenerSecciones,
} from '../../services/admin';
import type { SeccionAdminDTO } from '../../types/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  obtenerSecciones: vi.fn(),
  editarSeccion: vi.fn(),
  obtenerDocentes: vi.fn(),
  obtenerCatalogoActivo: vi.fn(),
}));

const listar = vi.mocked(obtenerSecciones);
const editar = vi.mocked(editarSeccion);
const docentes = vi.mocked(obtenerDocentes);
const catalogo = vi.mocked(obtenerCatalogoActivo);

const seccion = (o: Partial<SeccionAdminDTO>): SeccionAdminDTO => ({
  id: 's1',
  codigoCurso: 'IS101',
  nombreCurso: 'Algoritmos',
  codigoSeccion: '1',
  periodo: '2026-2',
  tipoEspacioRequerido: 'LABORATORIO',
  docente: { id: 'd1', codigoDocente: 'D001', nombre: 'Dra. García' },
  alumnosMatriculados: 30,
  horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
  softwareRequerido: [],
  asignacion: null,
  camposEditables: ['tipoEspacioRequerido', 'docenteId', 'softwareRequerido'],
  ...o,
});

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <SeccionesAdmin />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Gestión individual de secciones (Issue 4.31)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listar.mockResolvedValue({
      items: [
        seccion({
          asignacion: {
            id: 'a1',
            estado: 'VIGENTE',
            fechaAsignacion: '2026-10-01T10:00:00Z',
            corridaId: 'c1',
            motivoEscalamiento: null,
            espacios: [
              { id: 'e1', identificador: 'Lab 03', pabellon: 'A', piso: 2, tipo: 'LABORATORIO' },
            ],
          },
        }),
        seccion({
          id: 's2',
          codigoCurso: 'IS202',
          nombreCurso: 'Bases de datos',
          codigoSeccion: '2',
          asignacion: {
            id: 'a2',
            estado: 'ESCALADA',
            fechaAsignacion: '2026-10-01T10:00:00Z',
            corridaId: 'c1',
            motivoEscalamiento: '[SIN_HORARIOS_DEFINIDOS] La sección 02 no tiene horario',
            espacios: [],
          },
        }),
      ],
      total: 2,
      pagina: 1,
      limite: 200,
    });
    docentes.mockResolvedValue([
      { id: 'd1', codigoDocente: 'D001', nombre: 'Dra. García', departamento: 'Software' },
    ]);
    catalogo.mockResolvedValue({
      items: [{ id: 'sw1', nombre: 'Docker', version: '24.0', activo: true }],
      total: 1,
      page: 1,
      limit: 100,
    });
  });

  it('lista las secciones con su aula y su estado', async () => {
    montar();
    expect(await screen.findByText('IS101 · 1')).toBeInTheDocument();
    expect(screen.getByText('Algoritmos')).toBeInTheDocument();
    expect(screen.getByText('Lab 03')).toBeInTheDocument();
    expect(screen.getByText('Con aula')).toBeInTheDocument();
    expect(screen.getByText('Sin aula · revisión')).toBeInTheDocument();
  });

  it('filtra por búsqueda y por tipo de espacio', async () => {
    montar();
    await screen.findByText('IS101 · 1');

    fireEvent.change(screen.getByLabelText('Buscar sección'), { target: { value: 'bases' } });
    await waitFor(() =>
      expect(listar).toHaveBeenCalledWith(expect.objectContaining({ q: 'bases' })),
    );

    fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
      target: { value: 'AULA_TEORICA' },
    });
    await waitFor(() =>
      expect(listar).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'bases', tipo: 'AULA_TEORICA' }),
      ),
    );
  });

  it('abre el detalle de una sección y permite editarla', async () => {
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));

    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText(/Dra\. García/)).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    // El formulario ofrece el tipo de aula, el docente y el software requerido.
    expect(within(panel).getByLabelText('Tipo de espacio que necesita')).toBeInTheDocument();
    expect(within(panel).getByLabelText('Docente')).toBeInTheDocument();
    expect(within(panel).getByText('Software que exige la sección')).toBeInTheDocument();
  });

  it('envía el software requerido seleccionado al backend', async () => {
    editar.mockResolvedValue({
      seccion: seccion({}),
      alertas: [],
    });
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    fireEvent.click(await within(panel).findByRole('checkbox', { name: /Docker/ }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({
          softwareRequerido: [{ softwareId: 'sw1', comparacionVersion: 'CUALQUIERA' }],
        }),
      ),
    );
  });

  it('avisa cuando el cambio genera alertas en el panel', async () => {
    editar.mockResolvedValue({
      seccion: seccion({}),
      alertas: [{ id: 'al1', tipo: 'SOFTWARE', motivo: 'Lab 03 no tiene Docker' }],
    });
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));
    fireEvent.click(await within(panel).findByRole('checkbox', { name: /Docker/ }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/generó 1 alerta/)).toBeInTheDocument();
  });
});
