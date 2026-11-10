import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InicioAdmin from './InicioAdmin';
import {
  ejecutarCorrida,
  obtenerAlertas,
  obtenerLaboratoriosConEstado,
  obtenerMapaOcupacionAdmin,
  obtenerEscaladas,
  reintentarSeccion,
} from '../../services/admin';
import type { LaboratorioConEstadoDTO } from '../../services/admin';
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
  obtenerEspacios: vi.fn().mockResolvedValue([]),
  CLAVE_LABORATORIOS_ESTADO: 'laboratorios-estado',
  obtenerLaboratoriosConEstado: vi.fn(),
  obtenerMapaOcupacionAdmin: vi.fn(),
  obtenerAlertas: vi.fn(),
  obtenerEscaladas: vi.fn(),
  ejecutarCorrida: vi.fn(),
  reintentarSeccion: vi.fn(),
}));

/** Valor de una métrica: la `dd` que sigue a su `dt` (Issue 4.52). */
const valorMetrica = (etiqueta: string) => screen.getByText(etiqueta).nextElementSibling;

const alertas = vi.mocked(obtenerAlertas);
const laboratorios = vi.mocked(obtenerLaboratoriosConEstado);
const mapaAdmin = vi.mocked(obtenerMapaOcupacionAdmin);
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
      expect(screen.getByText('La sección 01 no tiene horario en 2026-II')).toBeInTheDocument();
      expect(screen.getByText(/45 alumnos/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Cargar horario' })).toHaveAttribute(
        'href',
        '/admin/carga#carga-horarios',
      );
      expect(screen.getByText('Sin motivo registrado.')).toBeInTheDocument();
      // Issue 4.52: cada métrica enlaza a su lista y la cifra de revisiones aparece una sola vez.
      expect(valorMetrica('Alertas pendientes')).toHaveTextContent('2');
      expect(screen.getByRole('link', { name: 'Ver alertas' })).toHaveAttribute(
        'href',
        '/admin/alertas',
      );
      expect(valorMetrica('Esperan revisión')).toHaveTextContent('2');
      expect(screen.getByRole('link', { name: 'Ver secciones en revisión' })).toHaveAttribute(
        'href',
        '#titulo-atencion',
      );
      expect(screen.queryByText(/secciones esperan revisión/)).toBeNull();
    });

    it('muestra el estado vacío cuando no hay escaladas', async () => {
      escaladas.mockResolvedValue({ periodo: null, total: 0, secciones: [] });
      montar();
      expect(
        await screen.findByText(/No hay secciones pendientes de revisión/),
      ).toBeInTheDocument();
    });

    it('pide confirmación, ejecuta la corrida y muestra el desglose', async () => {
      corrida.mockResolvedValue(resumen);
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      expect(screen.getByText(/Se volverán a asignar las aulas/)).toBeInTheDocument();
      expect(corrida).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));
      expect(
        await screen.findByText('Asignación terminada: se revisaron 10 secciones del periodo.'),
      ).toBeInTheDocument();
      expect(valorMetrica('Con aula nueva')).toHaveTextContent('6');
      expect(valorMetrica('Conservan la suya')).toHaveTextContent('2');
      expect(valorMetrica('Esperan revisión')).toHaveTextContent('2');
      await waitFor(() => expect(escaladas).toHaveBeenCalledTimes(2));
      expect(alertas).toHaveBeenCalledTimes(2);
    });

    it('avisa que la corrida puede tardar mientras se ejecuta (Issue 4.56)', async () => {
      let terminar: (r: typeof resumen) => void = () => undefined;
      corrida.mockReturnValue(new Promise((resolver) => (terminar = resolver)));
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));

      expect(await screen.findByText(/puede tardar hasta 1 min/i)).toBeInTheDocument();
      terminar(resumen);
      await waitFor(() => expect(screen.queryByText(/puede tardar hasta 1 min/i)).toBeNull());
    });

    it('ante un tiempo agotado no afirma que falló y ofrece actualizar (Issue 4.56)', async () => {
      corrida.mockRejectedValue({ code: 'ECONNABORTED', response: undefined });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));

      expect(await screen.findByText(/Puede que se haya completado/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Actualizar datos' }));
      await waitFor(() => expect(escaladas).toHaveBeenCalledTimes(2));
      expect(corrida).toHaveBeenCalledTimes(1);
    });

    it('con una corrida en curso (409) deshabilita «Asignar aulas» y explica por qué (Issue 4.56)', async () => {
      corrida.mockRejectedValue({
        response: { status: 409, data: { success: false, message: 'Ya hay una corrida en curso' } },
      });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));

      expect(await screen.findByText(/Hay otra asignación en curso/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Asignar aulas del periodo' })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Comprobar de nuevo' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Asignar aulas del periodo' })).toBeEnabled(),
      );
    });

    it('permite cancelar la corrida sin llamar al backend', async () => {
      montar();
      await screen.findByText(/IS101/);

      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByText(/Se volverán a asignar las aulas/)).toBeNull();
      expect(corrida).not.toHaveBeenCalled();
    });

    it('muestra el veredicto conforme del verificador (Issue 2.17)', async () => {
      corrida.mockResolvedValue({ ...resumen, verificacion: verificacionConforme });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));

      // El resumen va en la tarjeta del tablero…
      expect(await screen.findByText(/Conforme · 8 revisadas/)).toBeInTheDocument();
      // …y el detalle de las reglas, en el drawer a petición.
      fireEvent.click(screen.getByRole('button', { name: 'Ver el detalle de las reglas' }));
      expect(
        await screen.findByText('Conforme: la asignación cumple las 7 reglas.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Conforme')).toBeInTheDocument();
      expect(screen.getByText('8 asignaciones revisadas · 0 incumplimientos')).toBeInTheDocument();
      expect(screen.getByText('Sin doble reserva')).toBeInTheDocument();
      expect(screen.getByText('Capacidad suficiente')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
      expect(screen.queryByText('Sin doble reserva')).toBeNull();
    });

    it('detalla las violaciones cuando el verificador no es conforme', async () => {
      corrida.mockResolvedValue({ ...resumen, verificacion: verificacionNoConforme });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Ver el detalle de las reglas' }));

      expect(
        await screen.findByText('No conforme: 1 incumplimiento en 1 regla.'),
      ).toBeInTheDocument();
      expect(screen.getByText('No conforme')).toBeInTheDocument();
      expect(screen.getByText(/Ver 1 incumplimiento/)).toBeInTheDocument();
      expect(screen.getByText(/Aforo insuficiente para 45 alumnos/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    });

    it('avisa cuando la corrida no dejó asignaciones que verificar', async () => {
      corrida.mockResolvedValue({ ...resumen, verificacion: null });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));

      // En la tarjeta queda el distintivo de que no hubo nada que verificar.
      expect(await screen.findByText('Sin asignaciones que comprobar')).toBeVisible();
      // Y el aviso completo de la corrida vive en el drawer.
      fireEvent.click(screen.getByRole('button', { name: 'Ver el detalle de las reglas' }));
      expect(
        await screen.findByText(
          'No hubo asignaciones que comprobar en esta asignación automática.',
        ),
      ).toBeInTheDocument();
    });

    it('muestra el error si la corrida falla', async () => {
      corrida.mockRejectedValue(new Error('x'));
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));
      expect(await screen.findByText('Inténtalo de nuevo en unos minutos.')).toBeInTheDocument();
    });

    it('permite reintentar la corrida desde el aviso de error', async () => {
      corrida.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(resumen);
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getByRole('button', { name: 'Asignar aulas del periodo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, asignar aulas' }));

      const aviso = await screen.findByRole('alert');
      fireEvent.click(within(aviso).getByRole('button', { name: 'Reintentar' }));
      await waitFor(() => expect(corrida).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(valorMetrica('Con aula nueva')).toHaveTextContent('6'));
    });

    it('reintenta una sección escalada', async () => {
      reintento.mockResolvedValue({ ...resumen, modo: 'seccion' });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);
      await waitFor(() => expect(reintento).toHaveBeenCalledWith('sec1'));
      await waitFor(() => expect(escaladas).toHaveBeenCalledTimes(2));
    });

    it('informa el resultado del reintento cuando la sección sigue en revisión', async () => {
      reintento.mockResolvedValue({
        ...resumen,
        modo: 'seccion',
        asignadas: 0,
        mantenidas: 0,
        escaladas: 1,
      });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);

      expect(await screen.findByText('Esta sección sigue en revisión.')).toBeInTheDocument();
    });

    it('informa el resultado del reintento cuando la sección conserva su aula', async () => {
      reintento.mockResolvedValue({
        ...resumen,
        modo: 'seccion',
        asignadas: 0,
        mantenidas: 1,
        escaladas: 0,
      });
      montar();
      await screen.findByText(/IS101/);
      fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);

      expect(
        await screen.findByText('Esta sección conserva el aula que ya tenía.'),
      ).toBeInTheDocument();
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

    it('enlaza a carga de datos, espacios, secciones y auditoría', async () => {
      montar();
      await screen.findByText(/IS101/);
      // Se acota a la región «Accesos» del tablero: el menú superior usa los mismos nombres.
      const accesos = screen.getByRole('region', { name: 'Accesos' });
      expect(within(accesos).getByRole('link', { name: /Carga de datos/ })).toBeInTheDocument();
      expect(within(accesos).getByRole('link', { name: 'Espacios' })).toBeInTheDocument();
      expect(within(accesos).getByRole('link', { name: 'Secciones' })).toBeInTheDocument();
      expect(within(accesos).getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
      expect(within(accesos).getByRole('link', { name: 'Informe de salones' })).toBeInTheDocument();
      // La cifra de alertas ya está en su métrica: el atajo no la repite.
      const enlaceAlertas = within(accesos).getByRole('link', { name: 'Alertas' });
      expect(enlaceAlertas).not.toHaveTextContent(/\d/);
      expect(enlaceAlertas).toHaveAttribute('href', '/admin/alertas');
    });
  });

  describe('Jefatura (Issue 4.16)', () => {
    const lab = (o: Partial<LaboratorioConEstadoDTO>): LaboratorioConEstadoDTO => ({
      id: 'l1',
      identificador: 'Lab 04',
      tipo: 'LABORATORIO',
      pabellon: 'Nuevo Pabellón',
      piso: 2,
      aforoNominal: 30,
      softwareInstalado: [],
      pcsMalogradas: 3,
      habilitado: true,
      descripcionUso: null,
      contiguos: [],
      camposEditables: [],
      estado: 'DISPONIBLE',
      capacidadReal: 27,
      asignacion: null,
      alertas: [],
      ...o,
    });

    beforeEach(() => {
      rol = 'JEFATURA_LABORATORIOS';
      mapaAdmin.mockImplementation(async (pabellon: string, piso: number) => ({
        pabellon,
        piso,
        espacios: [],
      }));
      laboratorios.mockResolvedValue([
        lab({}),
        lab({
          id: 'l2',
          identificador: 'Lab 02',
          pcsMalogradas: 0,
          capacidadReal: 25,
          aforoNominal: 25,
        }),
        lab({ id: 'l3', identificador: 'Lab 06', habilitado: false, pcsMalogradas: 5 }),
      ]);
    });

    it('muestra labs activos y PCs operativas e inoperativas', async () => {
      alertas.mockResolvedValue([]);
      montar();
      expect(await screen.findByText('Laboratorios activos')).toBeInTheDocument();
      expect(valorMetrica('Laboratorios activos')).toHaveTextContent('2/3');
      // Solo cuentan los laboratorios habilitados: 27 + 25 operativas, 3 + 0 inoperativas.
      expect(valorMetrica('PCs operativas')).toHaveTextContent('52');
      expect(valorMetrica('PCs inoperativas')).toHaveTextContent('3');
      expect(escaladas).not.toHaveBeenCalled();
    });

    it('destaca la alerta pendiente más reciente', async () => {
      alertas.mockResolvedValue([
        alerta({
          id: '1',
          motivo: 'Falta Docker',
          espacio: { id: 'l1', identificador: 'Lab 04', pabellon: 'N', piso: 2 },
        }),
        alerta({ id: '2', tipo: 'CAPACIDAD', motivo: 'Antigua' }),
        alerta({ id: '3', estado: 'RESUELTA' }),
      ]);
      montar();
      const seccion = await screen.findByRole('region', { name: 'Alerta más reciente' });
      expect(within(seccion).getByText('Falta Docker')).toBeInTheDocument();
      expect(valorMetrica('Alertas pendientes')).toHaveTextContent('2');
    });

    it('ofrece el listado de laboratorios, las alertas y el cambio de laboratorio', async () => {
      alertas.mockResolvedValue([]);
      montar();
      expect(
        await screen.findByRole('link', { name: /Ver todos mis laboratorios/ }),
      ).toHaveAttribute('href', '/admin/laboratorios');
      expect(screen.getByRole('link', { name: /Reportar cambio de laboratorio/ })).toBeTruthy();
      expect(
        screen.getByRole('link', { name: /Alertas de mis laboratorios/ }),
      ).not.toHaveTextContent(/\d/);
    });

    it('muestra el error de carga con opción de reintentar', async () => {
      alertas.mockRejectedValueOnce(new Error('x'));
      alertas.mockResolvedValue([]);
      montar();
      fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText('Alertas pendientes')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull());
    });

    it('muestra el mapa de ocupación con sus laboratorios', async () => {
      alertas.mockResolvedValue([]);
      montar();
      expect(
        await screen.findByRole('heading', { name: 'Tus laboratorios en el mapa de ocupación' }),
      ).toBeInTheDocument();
      await waitFor(() => expect(mapaAdmin).toHaveBeenCalled());
    });
  });
});
