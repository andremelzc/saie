import { EstadoAsignacion, TipoEventoAuditoria } from '@prisma/client';
import {
  generarReporteAsignaciones,
  listarAuditoria,
  listarHistorialAsignaciones,
} from '../../../src/services/auditoria.service';

function registro(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aud-1',
    tipoEvento: TipoEventoAuditoria.ASIGNACION,
    detalle: 'Asignación automática exitosa a espacios: [esp-1]',
    fechaHora: new Date('2026-10-01T10:00:00Z'),
    asignacionId: 'asig-1',
    alertaId: null,
    asignacion: {
      seccion: {
        id: 'sec-1',
        codigoSeccion: '1',
        curso: { codigo: 'IS101', nombre: 'Algoritmos' },
      },
    },
    ...overrides,
  };
}

function asignacion(estado: EstadoAsignacion = EstadoAsignacion.VIGENTE) {
  return {
    id: 'asig-1',
    seccionId: 'sec-1',
    estado,
    fechaAsignacion: new Date('2026-10-01T10:00:00Z'),
    corridaId: 'corrida-1',
    motivoEscalamiento: null,
    espacios: [
      {
        espacioId: 'esp-1',
        espacio: { id: 'esp-1', identificador: 'Aula 201', pabellon: 'A', piso: 2 },
      },
    ],
    seccion: {
      codigoSeccion: '1',
      periodo: '2026-2',
      curso: { codigo: 'IS101', nombre: 'Algoritmos' },
    },
  };
}

describe('Auditoría e historial de asignaciones (Issue 4.32)', () => {
  describe('listado de auditoría', () => {
    function dbMock(filas: unknown[] = []) {
      return {
        registroAuditoria: {
          count: jest.fn().mockResolvedValue(filas.length),
          findMany: jest.fn().mockResolvedValue(filas),
        },
      } as any;
    }

    it('devuelve los asientos con su sección', async () => {
      const db = dbMock([registro()]);
      const res = await listarAuditoria({ pagina: 1, limite: 50 }, db);

      expect(res.total).toBe(1);
      expect(res.items[0].tipoEvento).toBe(TipoEventoAuditoria.ASIGNACION);
      expect(res.items[0].seccion?.codigoCurso).toBe('IS101');
      expect(res.items[0].fechaHora).toBe('2026-10-01T10:00:00.000Z');
    });

    it('filtra por tipo de evento', async () => {
      const db = dbMock([]);
      await listarAuditoria({ tipo: TipoEventoAuditoria.ALERTA, pagina: 1, limite: 50 }, db);
      expect(db.registroAuditoria.findMany.mock.calls[0][0].where).toEqual({
        tipoEvento: TipoEventoAuditoria.ALERTA,
      });
    });

    it('filtra por rango de fechas', async () => {
      const db = dbMock([]);
      const desde = new Date('2026-10-01T00:00:00Z');
      const hasta = new Date('2026-10-31T23:59:59Z');
      await listarAuditoria({ desde, hasta, pagina: 1, limite: 50 }, db);
      expect(db.registroAuditoria.findMany.mock.calls[0][0].where.fechaHora).toEqual({
        gte: desde,
        lte: hasta,
      });
    });
  });

  describe('historial de asignaciones', () => {
    function dbMock(filas: unknown[] = []) {
      return {
        asignacion: {
          count: jest.fn().mockResolvedValue(filas.length),
          findMany: jest.fn().mockResolvedValue(filas),
        },
      } as any;
    }

    it('incluye las asignaciones históricas con su aula', async () => {
      const db = dbMock([asignacion(EstadoAsignacion.HISTORICA)]);
      const res = await listarHistorialAsignaciones({ pagina: 1, limite: 50 }, db);

      expect(res.items[0].estado).toBe(EstadoAsignacion.HISTORICA);
      expect(res.items[0].espacios[0].identificador).toBe('Aula 201');
      expect(res.items[0].corridaId).toBe('corrida-1');
    });

    it('filtra por sección, periodo y estado', async () => {
      const db = dbMock([]);
      await listarHistorialAsignaciones(
        {
          seccionId: 'sec-1',
          periodo: '2026-2',
          estado: EstadoAsignacion.ESCALADA,
          pagina: 1,
          limite: 50,
        },
        db,
      );
      expect(db.asignacion.findMany.mock.calls[0][0].where).toEqual({
        seccionId: 'sec-1',
        seccion: { periodo: '2026-2' },
        estado: EstadoAsignacion.ESCALADA,
      });
    });
  });

  describe('informe de salones (Issue 4.33)', () => {
    function dbMock(secciones: unknown[] = []) {
      return {
        seccion: {
          findFirst: jest.fn().mockResolvedValue({ periodo: '2026-2' }),
          findMany: jest.fn().mockResolvedValue(secciones),
        },
      } as any;
    }

    function seccionConAula(
      aula: { identificador: string; pabellon: string; piso: number } | null,
    ) {
      return {
        codigoSeccion: '1',
        periodo: '2026-2',
        tipoEspacioRequerido: 'LABORATORIO',
        curso: { codigo: 'IS101', nombre: 'Algoritmos' },
        docente: { nombre: 'Dra. García' },
        _count: { matriculas: 30 },
        softwareRequerido: [{ software: { nombre: 'Docker', version: '24.0' } }],
        horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
        asignaciones: aula
          ? [
              {
                id: 'asig-1',
                estado: EstadoAsignacion.VIGENTE,
                fechaAsignacion: new Date('2026-10-01T10:00:00Z'),
                corridaId: 'c1',
                motivoEscalamiento: null,
                espacios: [
                  { espacioId: 'esp-1', espacio: { ...aula, id: 'esp-1', tipo: 'LABORATORIO' } },
                ],
              },
            ]
          : [],
      };
    }

    it('arma una fila por sección con su aula', async () => {
      const db = dbMock([seccionConAula({ identificador: 'Lab 03', pabellon: 'A', piso: 2 })]);

      const res = await generarReporteAsignaciones(undefined, db);

      expect(res.periodo).toBe('2026-2');
      expect(res.secciones).toHaveLength(1);
      expect(res.secciones[0].aula?.identificador).toBe('Lab 03');
      expect(res.secciones[0].sinAula).toBe(false);
      expect(res.secciones[0].softwareRequerido).toEqual(['Docker 24.0']);
      expect(res.totales).toMatchObject({ secciones: 1, asignadas: 1, sinAula: 0, alumnos: 30 });
    });

    it('marca las secciones sin aula para que se revisen antes de presentar', async () => {
      const db = dbMock([seccionConAula(null)]);

      const res = await generarReporteAsignaciones('2026-2', db);

      expect(res.secciones[0].sinAula).toBe(true);
      expect(res.secciones[0].aula).toBeNull();
      expect(res.totales.sinAula).toBe(1);
    });

    it('404 si no hay ningún periodo con secciones', async () => {
      const db = {
        seccion: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn() },
      } as any;
      await expect(generarReporteAsignaciones(undefined, db)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
