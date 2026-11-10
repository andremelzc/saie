import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuditoriaAdmin from './AuditoriaAdmin';
import ReporteSalones from './ReporteSalones';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import {
  obtenerAuditoria,
  obtenerEspacios,
  obtenerHistorial,
  obtenerReporteAsignaciones,
  obtenerSecciones,
} from '../../services/admin';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import type { EspacioAdminDTO, ListadoSeccionesDTO } from '../../types/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  obtenerEspacios: vi.fn(),
  obtenerSecciones: vi.fn(),
  obtenerAuditoria: vi.fn(),
  obtenerHistorial: vi.fn(),
  obtenerReporteAsignaciones: vi.fn(),
}));

const auditoria = vi.mocked(obtenerAuditoria);
const historial = vi.mocked(obtenerHistorial);
const reporte = vi.mocked(obtenerReporteAsignaciones);
const espacios = vi.mocked(obtenerEspacios);
const secciones = vi.mocked(obtenerSecciones);

const UUID_AULA = '6f1c2a3b-4d5e-4f60-8a71-9b8c7d6e5f40';
const UUID_CORRIDA = '11111111-2222-4333-8444-555555555555';

const montar = (pantalla: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>{pantalla}</ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Auditoria e historial (Issue 4.32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    espacios.mockResolvedValue([
      {
        id: UUID_AULA,
        identificador: 'Aula 102',
        pabellon: 'C',
        piso: 3,
      } as EspacioAdminDTO,
    ]);
    historial.mockResolvedValue({
      items: [
        {
          id: 'a1',
          seccionId: 's1',
          codigoCurso: 'IS101',
          nombreCurso: 'Algoritmos',
          codigoSeccion: '1',
          periodo: '2026-2',
          estado: 'HISTORICA',
          fechaAsignacion: '2026-10-01T10:00:00Z',
          corridaId: 'c1',
          motivoEscalamiento: null,
          espacios: [{ id: 'e1', identificador: 'Lab 03', pabellon: 'A', piso: 2 }],
        },
      ],
      total: 1,
      pagina: 1,
      limite: 200,
    });
    auditoria.mockResolvedValue({
      items: [
        {
          id: 'au1',
          tipoEvento: 'ASIGNACION',
          detalle: 'Asignación automática exitosa',
          fechaHora: '2026-10-01T10:00:00Z',
          asignacionId: 'a1',
          alertaId: null,
          seccion: {
            id: 's1',
            codigoCurso: 'IS101',
            codigoSeccion: '1',
            nombreCurso: 'Algoritmos',
          },
        },
      ],
      total: 1,
      pagina: 1,
      limite: 200,
    });
  });

  it('muestra el historial de asignaciones con su estado', async () => {
    montar(<AuditoriaAdmin />);

    expect((await screen.findAllByText('IS101 · 1')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Anterior').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lab 03').length).toBeGreaterThan(0);
  });

  it('agrupa por corrida con un resumen legible y sin mostrar el UUID', async () => {
    montar(<AuditoriaAdmin />);
    await screen.findAllByText('IS101 · 1');

    expect(
      screen.getByRole('heading', { level: 3, name: /^Asignación automática del .* · 1 asignada/ }),
    ).toBeVisible();
    expect(screen.queryByText('c1')).not.toBeInTheDocument();
  });

  it('filtra el historial por periodo y estado', async () => {
    montar(<AuditoriaAdmin />);
    await screen.findAllByText('IS101 · 1');

    fireEvent.change(screen.getByLabelText('Periodo'), { target: { value: '2026-1' } });
    await waitFor(() =>
      expect(historial).toHaveBeenCalledWith(expect.objectContaining({ periodo: '2026-1' })),
    );

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ESCALADA' } });
    await waitFor(() =>
      expect(historial).toHaveBeenCalledWith(
        expect.objectContaining({ periodo: '2026-1', estado: 'ESCALADA' }),
      ),
    );
  });

  it('muestra el estado vacio cuando no hay historial', async () => {
    historial.mockResolvedValue({ items: [], total: 0, pagina: 1, limite: 200 });
    montar(<AuditoriaAdmin />);

    expect(await screen.findByText(/Sin asignaciones registradas/)).toBeInTheDocument();
  });

  it('cambia a la vista de auditoría y filtra por tipo de evento', async () => {
    montar(<AuditoriaAdmin />);
    await screen.findAllByText('IS101 · 1');

    fireEvent.click(screen.getByRole('tab', { name: 'Registro de actividad' }));
    expect((await screen.findAllByText('Asignación automática exitosa')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('IS101 · 1').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Tipo de evento'), {
      target: { value: 'ALERTA' },
    });
    await waitFor(() =>
      expect(auditoria).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'ALERTA' })),
    );
  });

  it('muestra el estado vacio de la auditoría', async () => {
    auditoria.mockResolvedValue({ items: [], total: 0, pagina: 1, limite: 200 });
    montar(<AuditoriaAdmin />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Registro de actividad' }));
    expect(await screen.findByText(/Sin actividad registrada/)).toBeInTheDocument();
  });

  it('muestra cada registro como una frase con el aula y su ubicación, sin UUID (Issue 4.49)', async () => {
    auditoria.mockResolvedValue({
      items: [
        {
          id: 'au2',
          tipoEvento: 'ASIGNACION',
          detalle: `[Origen: MANUAL] Corrida Batch [${UUID_CORRIDA}] - Asignada a: [${UUID_AULA}]`,
          fechaHora: '2026-10-12T15:32:00Z',
          asignacionId: 'a1',
          alertaId: null,
          seccion: { id: 's1', codigoCurso: 'CC-101', codigoSeccion: '1', nombreCurso: 'Intro' },
        },
      ],
      total: 1,
      pagina: 1,
      limite: 200,
    });
    montar(<AuditoriaAdmin />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Registro de actividad' }));

    const frases = await screen.findAllByText('CC-101 · 1 pasó a Aula 102 (Pabellón C, piso 3)');
    expect(frases.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Asignación automática del /).length).toBeGreaterThan(0);
    // El UUID solo existe dentro del bloque plegable «Detalle técnico».
    for (const nodo of screen.queryAllByText(new RegExp(UUID_AULA))) {
      expect(nodo.closest('details')).not.toBeNull();
    }
    expect(screen.getAllByText('Detalle técnico').length).toBeGreaterThan(0);
  });

  it('busca una sección y muestra solo sus registros (Issue 4.46)', async () => {
    secciones.mockResolvedValue({
      items: [
        {
          id: 's1',
          codigoCurso: 'IS101',
          nombreCurso: 'Algoritmos',
          codigoSeccion: '1',
          periodo: '2026-2',
        },
      ],
      total: 1,
      pagina: 1,
      limite: 8,
    } as unknown as ListadoSeccionesDTO);
    montar(<AuditoriaAdmin />);
    await screen.findAllByText('IS101 · 1');

    fireEvent.change(screen.getByLabelText('Sección o curso'), { target: { value: 'IS1' } });
    await waitFor(() =>
      expect(secciones).toHaveBeenCalledWith(expect.objectContaining({ q: 'IS1' })),
    );
    fireEvent.click(
      within(await screen.findByRole('list', { name: 'Secciones encontradas' })).getByRole(
        'button',
        { name: /IS101 · 1/ },
      ),
    );

    await waitFor(() =>
      expect(historial).toHaveBeenCalledWith(expect.objectContaining({ seccionId: 's1' })),
    );
    expect(screen.getByRole('button', { name: /Quitar filtro Sección/ })).toBeInTheDocument();
  });

  it('filtra por rango de fechas y avisa si el rango está al revés (Issue 4.46)', async () => {
    montar(<AuditoriaAdmin />);
    await screen.findAllByText('IS101 · 1');

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-05' } });
    // La asignación es del 1 de octubre: queda fuera del rango.
    expect(await screen.findByText('Sin coincidencias')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Registro de actividad' }));
    await waitFor(() =>
      expect(auditoria).toHaveBeenCalledWith(
        expect.objectContaining({ desde: new Date('2026-10-05T00:00:00').toISOString() }),
      ),
    );

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-01' } });
    expect(await screen.findByText(/posterior a «Hasta»/)).toBeInTheDocument();
  });

  it('abre la línea de tiempo de la sección al pulsar una fila (Issue 4.46)', async () => {
    historial.mockImplementation(async (filtros) =>
      filtros?.seccionId
        ? {
            items: [
              {
                id: 'a3',
                seccionId: 's1',
                codigoCurso: 'IS101',
                nombreCurso: 'Algoritmos',
                codigoSeccion: '1',
                periodo: '2026-2',
                estado: 'VIGENTE',
                fechaAsignacion: '2026-10-03T10:00:00Z',
                corridaId: 'c2',
                motivoEscalamiento: null,
                espacios: [{ id: 'e2', identificador: 'Lab 05', pabellon: 'A', piso: 3 }],
              },
              {
                id: 'a1',
                seccionId: 's1',
                codigoCurso: 'IS101',
                nombreCurso: 'Algoritmos',
                codigoSeccion: '1',
                periodo: '2026-2',
                estado: 'HISTORICA',
                fechaAsignacion: '2026-10-01T10:00:00Z',
                corridaId: 'c1',
                motivoEscalamiento: null,
                espacios: [{ id: 'e1', identificador: 'Lab 03', pabellon: 'A', piso: 2 }],
              },
            ],
            total: 2,
            pagina: 1,
            limite: 200,
          }
        : {
            items: [
              {
                id: 'a1',
                seccionId: 's1',
                codigoCurso: 'IS101',
                nombreCurso: 'Algoritmos',
                codigoSeccion: '1',
                periodo: '2026-2',
                estado: 'HISTORICA',
                fechaAsignacion: '2026-10-01T10:00:00Z',
                corridaId: 'c1',
                motivoEscalamiento: null,
                espacios: [{ id: 'e1', identificador: 'Lab 03', pabellon: 'A', piso: 2 }],
              },
            ],
            total: 1,
            pagina: 1,
            limite: 200,
          },
    );
    montar(<AuditoriaAdmin />);
    await screen.findAllByText('IS101 · 1');

    fireEvent.click(
      screen.getAllByRole('button', { name: /IS101 · 1: ver su línea de tiempo/ })[0],
    );
    const linea = await screen.findByRole('list', { name: 'Línea de tiempo de la sección' });
    const pasos = within(linea).getAllByRole('listitem');
    expect(pasos[0]).toHaveTextContent('Asignada a Lab 03');
    expect(pasos[1]).toHaveTextContent('Reasignada a Lab 05');
    expect(pasos[1]).toHaveTextContent(/actual/);
  });

  it('avisa si la auditoría no se puede cargar', async () => {
    auditoria.mockRejectedValue(new Error('sin red'));
    montar(<AuditoriaAdmin />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Registro de actividad' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('Informe de salones (Issue 4.33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    reporte.mockResolvedValue({
      periodo: '2026-2',
      generadoEn: '2026-10-20T10:00:00Z',
      secciones: [
        {
          codigoCurso: 'IS101',
          nombreCurso: 'Algoritmos',
          codigoSeccion: '1',
          tipoEspacioRequerido: 'LABORATORIO',
          docente: 'Dra. García',
          aula: { identificador: 'Lab 03', pabellon: 'A', piso: 2 },
          sinAula: false,
          horarios: ['LUNES 08:00-10:00'],
          alumnosMatriculados: 30,
          softwareRequerido: ['Docker 24.0'],
        },
        {
          codigoCurso: 'IS202',
          nombreCurso: 'Bases de datos',
          codigoSeccion: '2',
          tipoEspacioRequerido: 'AULA_TEORICA',
          docente: null,
          aula: null,
          sinAula: true,
          horarios: [],
          alumnosMatriculados: 20,
          softwareRequerido: [],
        },
      ],
      totales: {
        secciones: 2,
        asignadas: 1,
        sinAula: 1,
        aulasDistintas: 1,
        alumnos: 50,
      },
    });
  });

  it('arma el cuadro con las secciones y su aula', async () => {
    montar(<ReporteSalones />);

    expect(await screen.findByText('Cuadro de asignación de aulas')).toBeInTheDocument();
    // El cuadro se dibuja como tabla (desde `lg` y al imprimir) y como tarjetas (móvil); en jsdom
    // no hay CSS, así que se consulta la tabla.
    const tabla = within(screen.getByRole('region', { name: 'Cuadro de asignación de aulas' }));
    expect(tabla.getByText('Algoritmos')).toBeInTheDocument();
    expect(tabla.getByText('Lab 03')).toBeInTheDocument();
    expect(tabla.getByText('A · piso 2')).toBeInTheDocument();
    expect(tabla.getByText('Docker 24.0')).toBeInTheDocument();
  });

  it('ofrece tarjetas del cuadro para pantallas estrechas (Issue 3.54)', async () => {
    montar(<ReporteSalones />);
    await screen.findByText('Cuadro de asignación de aulas');

    const tarjetas = screen
      .getAllByRole('listitem')
      .filter((li) => li.textContent?.includes('Algoritmos'));
    expect(tarjetas.length).toBeGreaterThan(0);
    expect(tarjetas[0]).toHaveTextContent('Lab 03');
  });

  it('avisa de las secciones que todavía no tienen aula', async () => {
    montar(<ReporteSalones />);

    const aviso = await screen.findByText(/1 sección todavía no tiene aula/);
    expect(aviso).toBeInTheDocument();
    expect(screen.getAllByText('Sin aula').length).toBeGreaterThan(0);
  });

  it('muestra los totales del cuadro', async () => {
    montar(<ReporteSalones />);

    await screen.findByText('Cuadro de asignación de aulas');
    const totales = screen.getByText('Aulas usadas').closest('dl');
    expect(totales).toHaveTextContent('Secciones');
    expect(totales).toHaveTextContent('Con aula');
    expect(totales).toHaveTextContent('Sin aula');
    expect(totales).toHaveTextContent('Aulas usadas');
    // 2 secciones, 1 con aula, 1 sin aula y 1 aula usada.
    expect(totales?.textContent).toMatch(/Secciones2/);
    expect(totales?.textContent).toMatch(/Con aula1/);
    expect(totales?.textContent).toMatch(/Sin aula1/);
    expect(totales?.textContent).toMatch(/Aulas usadas1/);
  });

  it('el boton de PDF llama al dialogo de impresion', async () => {
    const imprimir = vi.fn();
    vi.stubGlobal('print', imprimir);

    montar(<ReporteSalones />);
    await screen.findByText('Cuadro de asignación de aulas');
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir o guardar como PDF' }));

    expect(imprimir).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('muestra el estado vacío con su acción si el periodo no tiene secciones (Issue 4.57)', async () => {
    reporte.mockResolvedValue({
      periodo: '2026-2',
      generadoEn: '2026-10-20T10:00:00Z',
      secciones: [],
      totales: { secciones: 0, asignadas: 0, sinAula: 0, aulasDistintas: 0, alumnos: 0 },
    });
    montar(<ReporteSalones />);

    expect(await screen.findByText('No hay secciones en este periodo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Carga de datos' })).toHaveAttribute(
      'href',
      '/admin/carga',
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('button', { name: 'Imprimir o guardar como PDF' })).toBeDisabled();
  });

  it('trata el 404 «sin periodo» como estado vacío, no como error (Issue 4.57)', async () => {
    reporte.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { success: false, message: 'No hay periodo' } },
    });
    montar(<ReporteSalones />);

    expect(await screen.findByText('No hay secciones en este periodo')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('avisa si el informe no se puede cargar', async () => {
    reporte.mockRejectedValue(new Error('sin red'));
    montar(<ReporteSalones />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
