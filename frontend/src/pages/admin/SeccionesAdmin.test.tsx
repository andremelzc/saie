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
    expect(screen.getByText('Algoritmos · Laboratorio')).toBeInTheDocument();
    expect(screen.getByText('Lab 03')).toBeInTheDocument();
    expect(screen.getByText('Con aula')).toBeInTheDocument();
    expect(screen.getByText('En revisión')).toBeInTheDocument();
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

  it('muestra la tarjeta de una sección sin asignación', async () => {
    listar.mockResolvedValue({
      items: [seccion({ id: 's3', codigoCurso: 'IS303', asignacion: null })],
      total: 1,
      pagina: 1,
      limite: 200,
    });
    montar();
    expect(await screen.findByText('Sin asignar')).toBeInTheDocument();
  });

  it('filtra el software del catálogo por su nombre', async () => {
    catalogo.mockResolvedValue({
      items: [
        { id: 'sw1', nombre: 'Docker', version: '24.0', activo: true },
        { id: 'sw2', nombre: 'Python', version: '3.12', activo: true },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    await within(panel).findByRole('checkbox', { name: /Docker/ });
    fireEvent.change(within(panel).getByLabelText('Buscar software del catálogo'), {
      target: { value: 'pyth' },
    });

    expect(within(panel).getByRole('checkbox', { name: /Python/ })).toBeInTheDocument();
    expect(within(panel).queryByRole('checkbox', { name: /Docker/ })).toBeNull();
  });

  it('envía el tipo de aula, el docente y el periodo filtrado', async () => {
    editar.mockResolvedValue({ seccion: seccion({}), alertas: [] });
    montar();
    fireEvent.change(screen.getByLabelText('Periodo'), { target: { value: '2026-1' } });
    await waitFor(() =>
      expect(listar).toHaveBeenCalledWith(expect.objectContaining({ periodo: '2026-1' })),
    );

    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    fireEvent.change(within(panel).getByLabelText('Tipo de espacio que necesita'), {
      target: { value: 'AULA_TEORICA' },
    });
    fireEvent.change(within(panel).getByLabelText('Docente'), { target: { value: 'd1' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ tipoEspacioRequerido: 'AULA_TEORICA', docenteId: 'd1' }),
      ),
    );
  });

  it('desmarcar el software lo quita de la lista a guardar', async () => {
    editar.mockResolvedValue({ seccion: seccion({}), alertas: [] });
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    const casilla = await within(panel).findByRole('checkbox', { name: /Docker/ });
    fireEvent.click(casilla);
    fireEvent.click(casilla); // marcar y desmarcar
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith('s1', expect.objectContaining({ softwareRequerido: [] })),
    );
  });

  it('avisa si el backend rechaza el cambio y deja el formulario abierto', async () => {
    editar.mockRejectedValue(new Error('El laboratorio no tiene ese software'));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));
    fireEvent.click(await within(panel).findByRole('checkbox', { name: /Docker/ }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }));

    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      'Inténtalo de nuevo en unos minutos.',
    );
  });

  it('cerrar el detalle deja de editar y hides la sección', async () => {
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancelar' }));

    expect(within(panel).getByRole('button', { name: 'Editar sección' })).toBeInTheDocument();
  });

  it('en pantallas estrechas el listado pasa a tarjetas', async () => {
    const anchoOriginal = window.innerWidth;
    window.innerWidth = 500;
    window.dispatchEvent(new Event('resize'));

    try {
      montar();
      const articulo = await screen.findByRole('article', { name: /IS101/ });
      expect(within(articulo).getByText('IS101 · 1')).toBeInTheDocument();
      expect(within(articulo).getByText('Lab 03')).toBeInTheDocument();
      expect(screen.queryByRole('table')).toBeNull();
    } finally {
      window.innerWidth = anchoOriginal;
      window.dispatchEvent(new Event('resize'));
    }
  });

  it('cerrar el panel de detalle lo oculta', async () => {
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de IS101 1/ }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
