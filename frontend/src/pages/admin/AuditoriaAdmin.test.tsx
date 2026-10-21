import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuditoriaAdmin from './AuditoriaAdmin';
import ReporteSalones from './ReporteSalones';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import {
  obtenerAuditoria,
  obtenerHistorial,
  obtenerReporteAsignaciones,
} from '../../services/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  obtenerAuditoria: vi.fn(),
  obtenerHistorial: vi.fn(),
  obtenerReporteAsignaciones: vi.fn(),
}));

const auditoria = vi.mocked(obtenerAuditoria);
const historial = vi.mocked(obtenerHistorial);
const reporte = vi.mocked(obtenerReporteAsignaciones);

const montar = (pantalla: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>{pantalla}</ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Auditoria e historial (Issue 4.32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(await screen.findByText('IS101 · 1')).toBeInTheDocument();
    expect(screen.getAllByText('Reemplazada').length).toBeGreaterThan(0);
    expect(screen.getByText('Lab 03')).toBeInTheDocument();
  });

  it('filtra el historial por periodo y estado', async () => {
    montar(<AuditoriaAdmin />);
    await screen.findByText('IS101 · 1');

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
    await screen.findByText('IS101 · 1');

    fireEvent.click(screen.getByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByText('Asignación automática exitosa')).toBeInTheDocument();
    expect(screen.getByText('IS101 · 1')).toBeInTheDocument();

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

    fireEvent.click(await screen.findByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByText(/Sin asientos de auditoría/)).toBeInTheDocument();
  });

  it('avisa si la auditoría no se puede cargar', async () => {
    auditoria.mockRejectedValue(new Error('sin red'));
    montar(<AuditoriaAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('Informe de salones (Issue 4.33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText('Algoritmos')).toBeInTheDocument();
    expect(screen.getByText('Lab 03')).toBeInTheDocument();
    expect(screen.getByText('A · piso 2')).toBeInTheDocument();
    expect(screen.getByText('Docker 24.0')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    expect(imprimir).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('avisa si el informe no se puede cargar', async () => {
    reporte.mockRejectedValue(new Error('sin red'));
    montar(<ReporteSalones />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
