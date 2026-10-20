import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InicioAdmin from './InicioAdmin';
import {
  ejecutarCorrida,
  obtenerAlertas,
  obtenerEscaladas,
  reintentarSeccion,
} from '../../services/admin';
import type {
  AlertaDTO,
  ReglaVerificacion,
  ResultadoVerificacionDTO,
  ResumenAsignacionDTO,
  SeccionesEscaladasDTO,
} from '../../types/admin';

let rol = 'COORDINACION_ACADEMICA';
vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  obtenerAlertas: vi.fn(),
  obtenerEscaladas: vi.fn(),
  ejecutarCorrida: vi.fn(),
  reintentarSeccion: vi.fn(),
}));

const alertas = vi.mocked(obtenerAlertas);
const escaladas = vi.mocked(obtenerEscaladas);
const corrida = vi.mocked(ejecutarCorrida);
const reintento = vi.mocked(reintentarSeccion);

const alerta = (o: Partial<AlertaDTO>): AlertaDTO => ({
  id: 'a',
  tipo: 'SOFTWARE',
  estado: 'PENDIENTE',
  motivo: 'm',
  fechaDeteccion: '2026-10-10T10:00:00Z',
  espacio: { id: 'e', identificador: 'LAB-1', pabellon: 'A', piso: 1 },
  asignacionesAfectadas: [],
  ...o,
});

const conEscaladas: SeccionesEscaladasDTO = {
  periodo: '2026-II',
  total: 2,
  secciones: [
    {
      asignacionId: 'x1',
      fechaEscalamiento: '2026-10-10T10:00:00Z',
      motivoEscalamiento: '[SIN_HORARIOS_DEFINIDOS] La sección 01 no tiene horario en 2026-II',
      seccion: {
        id: 'sec1',
        codigoCurso: 'IS101',
        nombreCurso: 'Algoritmos',
        codigoSeccion: '01',
        periodo: '2026-II',
        docenteNombre: null,
        tipoEspacioRequerido: 'AULA_TEORICA',
        alumnosMatriculados: 45,
      },
    },
    {
      asignacionId: 'x2',
      fechaEscalamiento: '2026-10-10T10:00:00Z',
      motivoEscalamiento: null,
      seccion: {
        id: 'sec2',
        codigoCurso: 'IS202',
        nombreCurso: 'Bases de datos',
        codigoSeccion: '02',
        periodo: '2026-II',
        docenteNombre: 'Ana',
        tipoEspacioRequerido: 'LABORATORIO',
        alumnosMatriculados: 20,
      },
    },
  ],
};

const resumen: ResumenAsignacionDTO = {
  modo: 'periodo',
  periodo: '2026-II',
  corridaId: 'c1',
  totalSecciones: 10,
  asignadas: 6,
  mantenidas: 2,
  escaladas: 2,
  verificacion: null,
  resultados: [],
};

const REGLAS: ReglaVerificacion[] = [
  'DOBLE_RESERVA',
  'CAPACIDAD_SUFICIENTE',
  'TIPO_HOMOGENEO',
  'BLOQUE_CONTIGUO',
  'SOFTWARE_COMPLETO',
  'ESCALADA_CON_MOTIVO',
  'UNA_VIGENTE_POR_SECCION',
];

const reglaConforme = (regla: ReglaVerificacion) => ({
  regla,
  descripcion: regla,
  revisadas: 8,
  cumplen: 8,
  violaciones: [],
});

const verificacionConforme: ResultadoVerificacionDTO = {
  conforme: true,
  totalRevisadas: 8,
  totalViolaciones: 0,
  reglas: REGLAS.map(reglaConforme),
};

const verificacionNoConforme: ResultadoVerificacionDTO = {
  conforme: false,
  totalRevisadas: 8,
  totalViolaciones: 1,
  reglas: REGLAS.map((regla) =>
    regla === 'CAPACIDAD_SUFICIENTE'
      ? {
          regla,
          descripcion: regla,
          revisadas: 8,
          cumplen: 7,
          violaciones: [
            {
              regla,
              asignacionId: 'a1',
              seccionId: 'sec1',
              codigoSeccion: '01',
              detalle: 'Aforo insuficiente para 45 alumnos',
            },
          ],
        }
      : reglaConforme(regla),
  ),
};

const montar = () =>
  render(
    <MemoryRouter>
      <InicioAdmin />
    </MemoryRouter>,
  );

describe('Inicio del panel administrativo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rol = 'COORDINACION_ACADEMICA';
    alertas.mockResolvedValue([alerta({ id: '1' }), alerta({ id: '2', tipo: 'CAPACIDAD' })]);
    escaladas.mockResolvedValue(conEscaladas);
  });

  describe('Coordinación (Issue 4.20)', () => {
    it('muestra el total de escaladas, el periodo y las secciones', async () => {
      montar();
      expect(await screen.findByText(/IS101 · 01 — Algoritmos/)).toBeInTheDocument();
      expect(screen.getByText(/Periodo 2026-II/)).toBeInTheDocument();
      expect(screen.getByText('Sin horarios definidos')).toBeInTheDocument();
      expect(screen.getAllByText('No se le asignó aula.')).toHaveLength(2);
      expect(screen.getByText('La sección 01 no tiene horario en 2026-II')).toBeInTheDocument();
      expect(screen.getByText(/45 alumnos matriculados/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Cargar horario' })).toHaveAttribute(
        'href',
        '/admin/carga#carga-horarios',
      );
      expect(screen.getByText('Sin motivo registrado.')).toBeInTheDocument();
      expect(await screen.findByText('2', { selector: 'span' })).toBeInTheDocument();
    });

    it('muestra el estado vacío cuando no hay escaladas', async () => {
      escaladas.mockResolvedValue({ periodo: null, total: 0, secciones: [] });
      montar();
      expect(await screen.findByText(/No hay secciones escaladas/)).toBeInTheDocument();
    });

    it('ejecuta la corrida y muestra el resumen', async () => {
      corrida.mockResolvedValue(resumen);
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar asignación del periodo' }));
      expect(await screen.findByText('8')).toBeInTheDocument();
      expect(screen.getByText(/escaladas de/)).toBeInTheDocument();
      expect(screen.getByText(/6 nueva\(s\) · 2 mantenida\(s\)/)).toBeInTheDocument();
      await waitFor(() => expect(escaladas).toHaveBeenCalledTimes(2));
    });

    it('muestra el veredicto conforme del verificador (Issue 2.17)', async () => {
      corrida.mockResolvedValue({ ...resumen, verificacion: verificacionConforme });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar asignación del periodo' }));

      expect(
        await screen.findByText('Conforme: la corrida cumple las 7 reglas duras.'),
      ).toBeInTheDocument();
      expect(screen.getByText('CONFORME')).toBeInTheDocument();
      expect(
        screen.getByText('8 asignación(es) revisada(s) · 0 violación(es)'),
      ).toBeInTheDocument();
      expect(screen.getByText('Sin doble reserva')).toBeInTheDocument();
      expect(screen.getByText('Capacidad suficiente')).toBeInTheDocument();
      expect(screen.getByText(/Verificador conforme · 8 revisadas/)).toBeInTheDocument();
    });

    it('detalla las violaciones cuando el verificador no es conforme', async () => {
      corrida.mockResolvedValue({ ...resumen, verificacion: verificacionNoConforme });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar asignación del periodo' }));

      expect(
        await screen.findByText('No conforme: 1 violación(es) en 1 regla(s).'),
      ).toBeInTheDocument();
      expect(screen.getByText('NO CONFORME')).toBeInTheDocument();
      expect(screen.getByText(/Ver 1 violación/)).toBeInTheDocument();
      expect(screen.getByText(/Aforo insuficiente para 45 alumnos/)).toBeInTheDocument();
      expect(screen.getByText(/Verificador no conforme · 1 violación/)).toBeInTheDocument();
    });

    it('avisa cuando la corrida no dejó asignaciones que verificar', async () => {
      corrida.mockResolvedValue({ ...resumen, verificacion: null });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar asignación del periodo' }));

      expect(
        await screen.findByText('No hubo asignaciones que verificar en esta corrida.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Verificador: sin asignaciones que revisar')).toBeInTheDocument();
    });

    it('muestra el error si la corrida falla', async () => {
      corrida.mockRejectedValue(new Error('x'));
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar asignación del periodo' }));
      expect(await screen.findByText('Inténtalo de nuevo en unos minutos.')).toBeInTheDocument();
    });

    it('permite reintentar la corrida desde el aviso de error', async () => {
      corrida.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(resumen);
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar asignación del periodo' }));

      const aviso = await screen.findByRole('alert');
      fireEvent.click(within(aviso).getByRole('button', { name: 'Reintentar' }));
      await waitFor(() => expect(corrida).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('8')).toBeInTheDocument();
    });

    it('reintenta una sección escalada', async () => {
      reintento.mockResolvedValue({ ...resumen, modo: 'seccion' });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);
      await waitFor(() => expect(reintento).toHaveBeenCalledWith('sec1'));
      await waitFor(() => expect(escaladas).toHaveBeenCalledTimes(2));
    });

    it('muestra el error si el reintento falla', async () => {
      reintento.mockRejectedValue(new Error('x'));
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[1]);
      expect(await screen.findByText('Inténtalo de nuevo en unos minutos.')).toBeInTheDocument();
    });

    it('muestra el error de carga de escaladas con opción de reintentar', async () => {
      escaladas.mockRejectedValueOnce(new Error('x'));
      montar();
      fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText(/IS101/)).toBeInTheDocument();
    });

    it('enlaza a carga de datos, espacios y alertas con el contador pendiente', async () => {
      montar();
      await screen.findByText(/IS101/);
      expect(screen.getByRole('link', { name: /Carga de datos maestros/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Gestión de espacios/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Alertas de aforo y software/ })).toHaveTextContent(
        '2',
      );
    });
  });

  describe('Jefatura (Issue 4.19)', () => {
    beforeEach(() => {
      rol = 'JEFATURA_LABORATORIOS';
    });

    it('resume las alertas por estado y tipo', async () => {
      alertas.mockResolvedValue([
        alerta({ id: '1' }),
        alerta({ id: '2', tipo: 'CAPACIDAD' }),
        alerta({ id: '3', tipo: 'CAPACIDAD', estado: 'RESUELTA' }),
      ]);
      montar();
      expect(await screen.findByText('Alertas pendientes')).toBeInTheDocument();
      expect(screen.getByText('De software').previousSibling).toHaveTextContent('1');
      expect(screen.getByText('De capacidad').previousSibling).toHaveTextContent('2');
      expect(screen.getByText('Alertas pendientes').previousSibling).toHaveTextContent('2');
      expect(screen.getByRole('link', { name: /Reportar cambio de laboratorio/ })).toBeTruthy();
      expect(escaladas).not.toHaveBeenCalled();
    });

    it('muestra el error de carga con opción de reintentar', async () => {
      alertas.mockRejectedValueOnce(new Error('x'));
      montar();
      fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText('Alertas pendientes')).toBeInTheDocument();
    });

    it('no muestra contador si no hay alertas pendientes', async () => {
      alertas.mockResolvedValue([]);
      montar();
      await screen.findByText('Alertas pendientes');
      expect(
        screen.getByRole('link', { name: /Alertas de mis laboratorios/ }),
      ).not.toHaveTextContent(/\d/);
    });
  });
});
