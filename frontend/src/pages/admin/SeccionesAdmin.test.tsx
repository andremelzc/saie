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

/**
 * El listado se dibuja dos veces (tabla desde `lg` y tarjetas por debajo, elegidas con CSS); en
 * jsdom no hay CSS, así que se consulta solo la tabla.
 */
const enLista = () =>
  within(screen.queryByRole('region', { name: 'Listado de secciones' }) ?? document.body);

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
    expect((await screen.findAllByText('IS101 · 1')).length).toBeGreaterThan(0);
    expect(enLista().getByText('Algoritmos')).toBeInTheDocument();
    expect(enLista().getByText('Lab 03')).toBeInTheDocument();
    expect(enLista().getByText('Aula confirmada')).toBeInTheDocument();
    expect(enLista().getByText('En revisión')).toBeInTheDocument();
  });

  it('filtra por búsqueda y por tipo de espacio', async () => {
    montar();
    await screen.findAllByText('IS101 · 1');

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

  it('muestra cada bloque horario en su propia línea (Issue 4.44)', async () => {
    listar.mockResolvedValue({
      items: [
        seccion({
          horarios: [
            { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
            { diaSemana: 'MIERCOLES', horaInicio: '14:00', horaFin: '16:00' },
            { diaSemana: 'VIERNES', horaInicio: '10:00', horaFin: '12:00' },
          ],
        }),
      ],
      total: 1,
      pagina: 1,
      limite: 50,
    });
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
    const panel = await screen.findByRole('dialog');
    const bloques = within(panel).getAllByRole('listitem');
    expect(bloques.map((b) => b.textContent)).toEqual(
      expect.arrayContaining([
        'Lunes 08:00 – 10:00',
        'Miércoles 14:00 – 16:00',
        'Viernes 10:00 – 12:00',
      ]),
    );
  });

  it('la tarjeta móvil muestra docente y tipo (Issue 4.44)', async () => {
    montar();
    const tarjeta = (await screen.findAllByRole('article', { name: 'IS101 · 1' }))[0];
    expect(within(tarjeta).getByText('Dra. García')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Laboratorio')).toBeInTheDocument();
  });

  it('abre el detalle de una sección y permite editarla', async () => {
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);

    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText(/Dra\. García/)).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    // El formulario ofrece el tipo de aula, el docente y el software requerido.
    expect(await within(panel).findByLabelText('Tipo de espacio que necesita')).toBeInTheDocument();
    expect(within(panel).getByLabelText('Docente')).toBeInTheDocument();
    expect(within(panel).getByText('Software que exige la sección')).toBeInTheDocument();
  });

  it('envía el software requerido seleccionado al backend', async () => {
    editar.mockResolvedValue({
      seccion: seccion({}),
      alertas: [],
    });
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
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

  it('no guarda software para un aula teórica y lo resume (Issue 3.41)', async () => {
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    fireEvent.change(await within(panel).findByLabelText('Tipo de espacio que necesita'), {
      target: { value: 'AULA_TEORICA' },
    });
    fireEvent.click(await within(panel).findByRole('checkbox', { name: /Docker/ }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }));

    expect(within(panel).getByRole('alert')).toHaveTextContent('Un aula teórica no tiene software');
    expect(within(panel).getByLabelText('Tipo de espacio que necesita')).toHaveFocus();
    expect(editar).not.toHaveBeenCalled();
  });

  it('avisa cuando el cambio genera alertas en el panel', async () => {
    editar.mockResolvedValue({
      seccion: seccion({}),
      alertas: [{ id: 'al1', tipo: 'SOFTWARE', motivo: 'Lab 03 no tiene Docker' }],
    });
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
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
    expect((await screen.findAllByText('Sin aula asignada')).length).toBeGreaterThan(0);
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
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
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

    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));

    fireEvent.change(await within(panel).findByLabelText('Tipo de espacio que necesita'), {
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
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
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
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
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
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar sección' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancelar' }));

    expect(within(panel).getByRole('button', { name: 'Editar sección' })).toBeInTheDocument();
  });

  it('ofrece la tabla (escritorio) y las tarjetas (móvil) y deja la elección al CSS', async () => {
    montar();
    const articulo = await screen.findByRole('article', { name: /IS101/ });
    expect(within(articulo).getByText('IS101 · 1')).toBeInTheDocument();
    expect(within(articulo).getByText('Lab 03')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('cerrar el panel de detalle lo oculta', async () => {
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ver detalle de IS101 1/ }))[0]);
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('muestra los filtros activos como chips y los limpia (Issue 4.40)', async () => {
    montar();
    await screen.findAllByText('IS101 · 1');
    fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
      target: { value: 'LABORATORIO' },
    });
    const chips = screen.getByRole('group', { name: 'Filtros activos' });
    expect(within(chips).getByText('Laboratorio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.queryByRole('group', { name: 'Filtros activos' })).toBeNull();
    expect(screen.getByLabelText('Tipo de espacio')).toHaveValue('TODOS');
  });

  describe('Paginación (Issue 4.38)', () => {
    beforeEach(() => {
      window.localStorage.clear();
      listar.mockImplementation(async (filtros = {}) => ({
        items: [seccion({ id: `s-${filtros.pagina}`, codigoCurso: `P${filtros.pagina}` })],
        total: 312,
        pagina: filtros.pagina ?? 1,
        limite: filtros.limite ?? 50,
      }));
    });

    it('pide 50 por página y muestra el total real', async () => {
      montar();
      const nav = await screen.findByRole('navigation', { name: 'Paginación de secciones' });
      expect(listar).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1, limite: 50 }));
      expect(nav).toHaveTextContent('Mostrando 1–50 de 312 secciones');
      expect(screen.getByText('312 secciones')).toBeInTheDocument();
    });

    it('navega de página y vuelve a la 1 al filtrar', async () => {
      montar();
      fireEvent.click(await screen.findByRole('button', { name: 'Página siguiente' }));
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })),
      );
      fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
        target: { value: 'LABORATORIO' },
      });
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(
          expect.objectContaining({ pagina: 1, tipo: 'LABORATORIO' }),
        ),
      );
    });

    it('recuerda el tamaño de página elegido', async () => {
      montar();
      fireEvent.change(await screen.findByLabelText('Por página'), { target: { value: '100' } });
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ limite: 100 })),
      );
      expect(window.localStorage.getItem('saie:secciones:tamanoPagina')).toBe('100');
    });
  });
});
