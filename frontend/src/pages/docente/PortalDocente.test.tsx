import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  explorarEspacios,
  obtenerEstadoLaboratorio,
  obtenerHorarioDocente,
  reportarIncidencia,
} from '../../services/docente';
import { horarioDocente } from '../../test/fixtures/docente';
import { esperarSinViolacionesGraves } from '../../test/axe';
import InicioDocentePage from './InicioDocentePage';
import HorarioDocentePage from './HorarioDocentePage';
import EspaciosDocentePage from './EspaciosDocentePage';
import IncidenciasDocentePage from './IncidenciasDocentePage';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'DOCENTE' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/docente', () => ({
  CLAVE_HORARIO_DOCENTE: 'docente:horario',
  obtenerHorarioDocente: vi.fn(),
  explorarEspacios: vi.fn(),
  obtenerEstadoLaboratorio: vi.fn(),
  reportarIncidencia: vi.fn(),
}));

const horario = vi.mocked(obtenerHorarioDocente);
const explorar = vi.mocked(explorarEspacios);
const laboratorio = vi.mocked(obtenerEstadoLaboratorio);
const reportar = vi.mocked(reportarIncidencia);

/** Lunes 09:30 (hora local): IS101 está en curso hasta las 10:00. */
const LUNES_930 = new Date(2026, 10, 9, 9, 30);

const montar = (nodo: React.ReactNode) =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>{nodo}</ProveedorAvisos>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vaciarCacheCarga();
  horario.mockResolvedValue(horarioDocente());
});

describe('Inicio del docente (Issue 7.8)', () => {
  it('muestra la próxima clase con su cuenta regresiva', async () => {
    montar(<InicioDocentePage ahora={LUNES_930} />);
    const tarjeta = await screen.findByRole('region', { name: 'Próxima clase' });
    expect(await within(tarjeta).findByText('Algoritmos')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Clase en curso')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Termina en 30 min')).toBeInTheDocument();
  });

  it('muestra las cifras del periodo y la barra de navegación del portal', async () => {
    montar(<InicioDocentePage ahora={LUNES_930} />);
    expect(await screen.findByText('secciones activas')).toBeInTheDocument();
    expect(screen.getByText('alumnos a cargo')).toBeInTheDocument();
    expect(screen.getByText('33')).toBeInTheDocument(); // 32 + 1 alumnos
    const nav = screen.getByRole('navigation', { name: 'Navegación del portal docente' });
    expect(within(nav).getByRole('link', { name: 'Horario' })).toHaveAttribute(
      'href',
      '/docente/horario',
    );
    expect(within(nav).getByRole('link', { name: 'Incidencias' })).toHaveAttribute(
      'href',
      '/docente/incidencias',
    );
  });

  it('lista las clases de hoy y la semana de un vistazo', async () => {
    montar(<InicioDocentePage ahora={LUNES_930} />);
    const hoy = await screen.findByRole('region', { name: 'Tus clases de hoy' });
    expect(within(hoy).getByText('Bases de datos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lunes, hoy, 2 clases' })).toBeInTheDocument();
  });

  it('si el horario falla muestra el error con «Reintentar»', async () => {
    horario.mockRejectedValue(new Error('Sin conexión'));
    montar(<InicioDocentePage ahora={LUNES_930} />);
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});

describe('Horario y asignaciones del docente (Issue 7.8)', () => {
  it('alterna entre la vista de día y la de semana', async () => {
    montar(<HorarioDocentePage ahora={LUNES_930} />);
    expect((await screen.findAllByText(/Algoritmos/)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }));
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lista todas las secciones activas con horario, espacio y alumnos', async () => {
    montar(<HorarioDocentePage ahora={LUNES_930} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Asignaciones' }));
    expect(screen.getByRole('heading', { name: 'IS101 · Sección 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'IS202 · Sección 2' })).toBeInTheDocument();
    expect(screen.getByText('32 alumnos')).toBeInTheDocument();
    expect(screen.getByText('Miércoles 08:00 – 10:00')).toBeInTheDocument();
  });
});

describe('Espacios y equipos del docente (Issue 7.9)', () => {
  beforeEach(() => {
    explorar.mockResolvedValue({
      franja: { diaSemana: 'LUNES', horaInicio: '09:30', horaFin: '09:31' },
      espacios: [
        {
          id: 'e1',
          identificador: 'A-101',
          tipo: 'AULA_TEORICA',
          pabellon: 'Antiguo',
          piso: 1,
          aforoNominal: 40,
          capacidadReal: 40,
          disponible: true,
        },
        {
          id: 'e2',
          identificador: 'L-204',
          tipo: 'LABORATORIO',
          pabellon: 'Nuevo',
          piso: 2,
          aforoNominal: 30,
          capacidadReal: 27,
          disponible: false,
        },
      ],
    });
    laboratorio.mockResolvedValue({
      laboratorio: {
        id: 'esp-l204',
        identificador: 'L-204',
        pabellon: 'Nuevo',
        piso: 2,
        aforoNominal: 30,
        pcsMalogradas: 3,
        pcsOperativas: 27,
        softwareInstalado: [{ id: 's1', nombre: 'Python', version: '3.12' }],
      },
      cursos: [
        {
          asignacionId: 'asg-1',
          codigoCurso: 'IS101',
          nombreCurso: 'Algoritmos',
          codigoSeccion: '1',
          softwareRequerido: [],
          softwareFaltante: ['Docker'],
          cumple: false,
        },
      ],
      historial: [],
    });
  });

  it('el explorador muestra la disponibilidad y filtra por tipo de espacio', async () => {
    montar(<EspaciosDocentePage />);
    const lista = await screen.findByRole('list', { name: 'Espacios encontrados' });
    expect(within(lista).getByText('Disponible')).toBeInTheDocument();
    expect(within(lista).getByText('Ocupado')).toBeInTheDocument();
    expect(within(lista).getByText(/de 30 puestos/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
      target: { value: 'LABORATORIO' },
    });
    await waitFor(() =>
      expect(explorar).toHaveBeenLastCalledWith(expect.objectContaining({ tipo: 'LABORATORIO' })),
    );
  });

  it('consulta otra franja solo cuando está completa y es válida', async () => {
    montar(<EspaciosDocentePage />);
    await screen.findByRole('list', { name: 'Espacios encontrados' });
    fireEvent.click(screen.getByLabelText('Consultar otro día u hora'));
    await waitFor(() =>
      expect(explorar).toHaveBeenLastCalledWith(
        expect.objectContaining({ dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }),
      ),
    );
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '07:00' } });
    expect(screen.getByRole('alert')).toHaveTextContent('posterior a la de inicio');
  });

  it('muestra las PCs operativas e inoperativas y el software de su laboratorio', async () => {
    montar(<EspaciosDocentePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mi laboratorio' }));
    const cifras = await screen.findByRole('list', { name: 'Estado de los equipos' });
    expect(within(cifras).getByText('27')).toBeInTheDocument();
    expect(within(cifras).getByText('PCs operativas')).toBeInTheDocument();
    expect(within(cifras).getByText('3')).toBeInTheDocument();
    expect(within(cifras).getByText('PCs inoperativas')).toBeInTheDocument();
    expect(screen.getByText('Python 3.12')).toBeInTheDocument();
    expect(screen.getByText('Falta: Docker')).toBeInTheDocument();
    expect(laboratorio).toHaveBeenCalledWith('esp-l204');
  });
});

describe('Reportar incidencia (Issue 7.10)', () => {
  it('exige tipo y descripción antes de habilitar el envío', async () => {
    montar(<IncidenciasDocentePage />);
    const enviar = await screen.findByRole('button', { name: 'Enviar reporte' });
    expect(enviar).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Tipo de incidencia/), {
      target: { value: 'EQUIPO_NO_OPERATIVO' },
    });
    expect(enviar).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: { value: 'Las PCs 5 y 6 no encienden.' },
    });
    expect(enviar).toBeEnabled();
  });

  it('envía el reporte y muestra el identificador, la prioridad y la ubicación', async () => {
    reportar.mockResolvedValue({
      identificadorSeguimiento: 'INC-1A2B3C4D',
      estado: 'PENDIENTE',
      fechaReporte: '2026-11-09T14:30:00Z',
      mensaje: 'Incidencia registrada',
    });
    montar(<IncidenciasDocentePage />);
    await screen.findByRole('button', { name: 'Enviar reporte' });
    fireEvent.change(screen.getByLabelText(/Tipo de incidencia/), {
      target: { value: 'SOFTWARE_FALTANTE' },
    });
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'ALTA' } });
    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: { value: '  Falta Docker en todas las PCs.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    const confirmacion = await screen.findByRole('status', { name: 'Incidencia registrada' });
    expect(reportar).toHaveBeenCalledWith({
      asignacionId: 'asg-1',
      espacioId: 'esp-l204',
      tipo: 'SOFTWARE_FALTANTE',
      prioridad: 'ALTA',
      descripcion: 'Falta Docker en todas las PCs.',
      evidencia: undefined,
    });
    expect(within(confirmacion).getByText('INC-1A2B3C4D')).toBeInTheDocument();
    expect(within(confirmacion).getByText('Prioridad alta')).toBeInTheDocument();
    expect(within(confirmacion).getByText('Laboratorio L-204')).toBeInTheDocument();
    expect(within(confirmacion).getByText('Nuevo, piso 2')).toBeInTheDocument();
  });

  it('al cambiar de clase ofrece el espacio de esa clase', async () => {
    montar(<IncidenciasDocentePage />);
    await screen.findByRole('button', { name: 'Enviar reporte' });
    fireEvent.change(screen.getByLabelText('Clase afectada'), { target: { value: 'asg-2' } });
    expect(screen.getByLabelText('Espacio')).toHaveValue('esp-a101');
  });

  it('sin clases asignadas explica por qué no puede reportar', async () => {
    horario.mockResolvedValue(horarioDocente({ asignacionesActivas: [] }));
    montar(<IncidenciasDocentePage />);
    expect(await screen.findByText('No tienes clases con aula asignada')).toBeInTheDocument();
  });
});

describe('Accesibilidad del portal docente con axe', () => {
  it('las cuatro pantallas no tienen violaciones de accesibilidad grave', async () => {
    explorar.mockResolvedValue({
      franja: { diaSemana: 'LUNES', horaInicio: '09:30', horaFin: '09:31' },
      espacios: [],
    });
    const pantallas = [
      {
        nombre: 'InicioDocentePage',
        nodo: <InicioDocentePage ahora={LUNES_930} />,
        texto: 'Algoritmos',
      },
      {
        nombre: 'HorarioDocentePage',
        nodo: <HorarioDocentePage ahora={LUNES_930} />,
        texto: 'Algoritmos',
      },
      {
        nombre: 'EspaciosDocentePage',
        nodo: <EspaciosDocentePage />,
        texto: 'Sin espacios que coincidan',
      },
      {
        nombre: 'IncidenciasDocentePage',
        nodo: <IncidenciasDocentePage />,
        texto: 'Nueva incidencia',
      },
    ];
    for (const p of pantallas) {
      const { container, unmount } = montar(p.nodo);
      await screen.findAllByText(p.texto);
      await esperarSinViolacionesGraves(container, { nombre: p.nombre });
      unmount();
    }
  });
});
