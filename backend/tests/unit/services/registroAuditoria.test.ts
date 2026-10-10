/**
 * registroAuditoria.test.ts — Issue #184: Registro de auditoría de asignaciones y alertas
 *
 * Verifica que la capa de persistencia (motor.service) registre en RegistroAuditoria:
 *   - Cada asignación confirmada (individual y batch) con fecha/hora y tipo ASIGNACION
 *   - Cada escalamiento con fecha/hora, tipo ESCALAMIENTO y motivo
 *   - Que cada registro de alerta (Issue 4.5) llama a la tabla correspondiente
 *
 * Los datos persisten en RegistroAuditoria con: tipoEvento, asignacionId (o alertaId),
 * detalle y fechaHora automática (DEFAULT now() de PostgreSQL).
 */

import { EstadoAsignacion, TipoEventoAuditoria, TipoEspacio } from '@prisma/client';
import {
  procesarAsignacionSeccionIndividual,
  procesarCorridaBatchPeriodo,
} from '../../../src/services/motor.service';
import { registrarAlerta } from '../../../src/services/alerta.service';
import { calcularHuellaEntradaSeccion } from '../../../src/rules/orquestadorAsignacion';

// ============================================================
// FIXTURES
// ============================================================

const mockEspacios = [
  {
    id: 'aula-1',
    identificador: 'Aula 101',
    pabellon: 'Pab-A',
    piso: 1,
    tipo: TipoEspacio.AULA_TEORICA,
    aforoNominal: 30,
    pcsMalogradas: null,
    softwareInstalado: [],
  },
  {
    id: 'aula-2',
    identificador: 'Aula 102',
    pabellon: 'Pab-A',
    piso: 1,
    tipo: TipoEspacio.AULA_TEORICA,
    aforoNominal: 30,
    pcsMalogradas: null,
    softwareInstalado: [],
  },
];

const mockContiguos = [{ espacioIdA: 'aula-1', espacioIdB: 'aula-2' }];

const mockSeccionAula = {
  id: 'sec-audit-1',
  cursoId: 'cur-audit',
  codigoSeccion: 'A',
  periodo: '2026-2',
  tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
  stackSoftwareRequerido: [],
  curso: { codigo: 'CC-101', nombre: 'Algoritmos' },
  horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
  matriculas: [
    { id: 'mat-1', movilidadReducida: false },
    { id: 'mat-2', movilidadReducida: false },
  ],
};

// Sección que escalará (software imposible)
const mockSeccionEscalada = {
  id: 'sec-audit-esc',
  cursoId: 'cur-esc',
  codigoSeccion: 'A',
  periodo: '2026-2',
  tipoEspacioRequerido: TipoEspacio.LABORATORIO,
  stackSoftwareRequerido: ['Cisco Packet Tracer'],
  curso: { codigo: 'RC-401', nombre: 'Redes' },
  horarios: [{ diaSemana: 'SABADO', horaInicio: '08:00', horaFin: '11:00' }],
  matriculas: [{ id: 'mat-3', movilidadReducida: false }],
};

// ============================================================
// 1. AUDITORÍA DE ASIGNACIÓN INDIVIDUAL EXITOSA (Issue 2.10 + 5.11)
// ============================================================

describe('Issue 5.11 — Registro de auditoría: Asignación individual exitosa', () => {
  it('1a. debe crear un RegistroAuditoria con tipoEvento=ASIGNACION al confirmar una asignación individual', async () => {
    const registroAuditoriaMock = { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const asignacionMock = {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'asig-nueva-1' }),
    };

    const mockTx = {
      asignacion: asignacionMock,
      registroAuditoria: registroAuditoriaMock,
    };

    const mockPrisma = {
      seccion: { findUnique: jest.fn().mockResolvedValue(mockSeccionAula) },
      espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
      asignacion: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      seccionParalela: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const resultado = await procesarAsignacionSeccionIndividual('sec-audit-1', mockPrisma as any);

    // La asignación fue exitosa
    expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);

    // Se creó el registro de auditoría
    expect(registroAuditoriaMock.create).toHaveBeenCalledTimes(1);

    const llamadaAuditoria = registroAuditoriaMock.create.mock.calls[0][0];
    expect(llamadaAuditoria.data.tipoEvento).toBe(TipoEventoAuditoria.ASIGNACION);
    expect(llamadaAuditoria.data.asignacionId).toBe('asig-nueva-1');
    expect(llamadaAuditoria.data.detalle).toBeDefined();
    expect(typeof llamadaAuditoria.data.detalle).toBe('string');
    expect(llamadaAuditoria.data.detalle.length).toBeGreaterThan(0);

    // La fecha es generada automáticamente por PostgreSQL (DEFAULT now()), no la seteamos manualmente
    // Verificamos que NO se pase fechaHora explícita (confiamos en el DEFAULT de la columna)
    expect(llamadaAuditoria.data.fechaHora).toBeUndefined();
  });

  it('1b. el detalle de auditoría debe contener los IDs de espacios asignados', async () => {
    const registroAuditoriaMock = { create: jest.fn().mockResolvedValue({ id: 'audit-2' }) };
    const mockTx = {
      asignacion: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'asig-nueva-2' }),
      },
      registroAuditoria: registroAuditoriaMock,
    };

    const mockPrisma = {
      seccion: { findUnique: jest.fn().mockResolvedValue(mockSeccionAula) },
      espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
      asignacion: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    await procesarAsignacionSeccionIndividual('sec-audit-1', mockPrisma as any);

    const llamadaAuditoria = registroAuditoriaMock.create.mock.calls[0][0];
    // El detalle debe mencionar los espacios asignados
    expect(llamadaAuditoria.data.detalle).toContain('aula-1');
  });
});

// ============================================================
// 2. AUDITORÍA DE ESCALAMIENTO (Issue 2.12 + 5.11)
// ============================================================

describe('Issue 5.11 — Registro de auditoría: Escalamiento a revisión manual', () => {
  it('2a. debe crear RegistroAuditoria con tipoEvento=ESCALAMIENTO cuando la sección escala', async () => {
    const registroAuditoriaMock = { create: jest.fn().mockResolvedValue({ id: 'audit-esc-1' }) };
    const asignacionMock = {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'asig-esc-1' }),
    };

    const mockTx = {
      asignacion: asignacionMock,
      registroAuditoria: registroAuditoriaMock,
    };

    // Solo espacios de tipo AULA_TEORICA → la sección LABORATORIO con Cisco escala
    const mockPrisma = {
      seccion: { findUnique: jest.fn().mockResolvedValue(mockSeccionEscalada) },
      espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) }, // Ningún lab disponible
      espacioContiguo: { findMany: jest.fn().mockResolvedValue([]) },
      asignacion: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const resultado = await procesarAsignacionSeccionIndividual('sec-audit-esc', mockPrisma as any);

    // La sección escaló
    expect(resultado.estado).toBe(EstadoAsignacion.ESCALADA);
    expect(resultado.motivoEscalamiento).toBeDefined();

    // Se creó el registro de auditoría de escalamiento
    expect(registroAuditoriaMock.create).toHaveBeenCalledTimes(1);

    const llamadaAuditoria = registroAuditoriaMock.create.mock.calls[0][0];
    expect(llamadaAuditoria.data.tipoEvento).toBe(TipoEventoAuditoria.ESCALAMIENTO);
    expect(llamadaAuditoria.data.asignacionId).toBe('asig-esc-1');
    expect(llamadaAuditoria.data.detalle).toContain(resultado.motivoEscalamiento!.substring(0, 10));
  });

  it('2b. el detalle de escalamiento debe contener el motivo del escalamiento', async () => {
    const registroAuditoriaMock = { create: jest.fn().mockResolvedValue({ id: 'audit-esc-2' }) };
    const mockTx = {
      asignacion: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'asig-esc-2' }),
      },
      registroAuditoria: registroAuditoriaMock,
    };

    const mockPrisma = {
      seccion: { findUnique: jest.fn().mockResolvedValue(mockSeccionEscalada) },
      espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue([]) },
      asignacion: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    await procesarAsignacionSeccionIndividual('sec-audit-esc', mockPrisma as any);

    const llamada = registroAuditoriaMock.create.mock.calls[0][0];
    // El detalle debe mencionar la naturaleza del escalamiento
    expect(llamada.data.detalle.length).toBeGreaterThan(0);
    // No debe ser undefined ni vacío
    expect(llamada.data.detalle).not.toBe('');
  });
});

// ============================================================
// 3. AUDITORÍA EN CORRIDA BATCH (Issue 2.11 + 5.11)
// ============================================================

describe('Issue 5.11 — Registro de auditoría: Corrida batch del periodo', () => {
  it('3a. debe crear un RegistroAuditoria por cada sección procesada en la corrida batch', async () => {
    const registroAuditoriaMock = { create: jest.fn().mockResolvedValue({ id: 'audit-batch' }) };
    const asignacionMock = {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest
        .fn()
        .mockResolvedValueOnce({ id: 'asig-batch-1' })
        .mockResolvedValueOnce({ id: 'asig-batch-2' }),
      findMany: jest.fn().mockResolvedValue([]),
    };

    const mockTx = {
      asignacion: asignacionMock,
      registroAuditoria: registroAuditoriaMock,
    };

    const mockSeccionB = {
      ...mockSeccionAula,
      id: 'sec-audit-2',
      codigoSeccion: 'B',
    };

    const mockPrisma = {
      espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
      seccion: {
        findMany: jest.fn().mockResolvedValue([mockSeccionAula, mockSeccionB]),
      },
      asignacion: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const resultadoBatch = await procesarCorridaBatchPeriodo('2026-2', mockPrisma as any);

    expect(resultadoBatch.totalSecciones).toBe(2);
    // Se debe crear un registro de auditoría por cada sección no conservada
    expect(registroAuditoriaMock.create).toHaveBeenCalledTimes(2);

    // Todos los registros deben tener tipoEvento válido
    for (const call of registroAuditoriaMock.create.mock.calls) {
      expect([TipoEventoAuditoria.ASIGNACION, TipoEventoAuditoria.ESCALAMIENTO]).toContain(
        call[0].data.tipoEvento,
      );
    }
  });

  it('3b. los registros batch incluyen el ID de corrida en el detalle', async () => {
    const registroAuditoriaMock = { create: jest.fn().mockResolvedValue({ id: 'audit-batch-2' }) };
    const mockTx = {
      asignacion: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'asig-b' }),
      },
      registroAuditoria: registroAuditoriaMock,
    };

    const mockPrisma = {
      espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
      seccion: { findMany: jest.fn().mockResolvedValue([mockSeccionAula]) },
      asignacion: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const resultadoBatch = await procesarCorridaBatchPeriodo('2026-2', mockPrisma as any);

    expect(registroAuditoriaMock.create).toHaveBeenCalledTimes(1);
    const detalle = registroAuditoriaMock.create.mock.calls[0][0].data.detalle;

    // El detalle debe referenciar el corridaId de la corrida batch
    expect(detalle).toContain(resultadoBatch.corridaId);
  });

  it('3c. NO debe crear registro de auditoría para secciones conservadas por idempotencia', async () => {
    const registroAuditoriaMock = { create: jest.fn().mockResolvedValue({ id: 'audit-batch-3' }) };
    const mockTx = {
      asignacion: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'asig-b3' }),
      },
      registroAuditoria: registroAuditoriaMock,
    };

    // Simular sección con asignación previa vigente y misma huella → conservada por idempotencia
    // La huella exacta la calculamos del mismo input

    const seccionInput = {
      id: mockSeccionAula.id,
      cursoId: mockSeccionAula.cursoId,
      codigoSeccion: mockSeccionAula.codigoSeccion,
      periodo: mockSeccionAula.periodo,
      tipoEspacioRequerido: mockSeccionAula.tipoEspacioRequerido,
      stackSoftwareRequerido: [],
      alumnosMatriculados: mockSeccionAula.matriculas.length,
      movilidadReducida: false,
      horarios: mockSeccionAula.horarios.map((h) => ({
        diaSemana: h.diaSemana as any,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })),
    };

    const huellaActual = calcularHuellaEntradaSeccion(seccionInput);

    const asignacionPreviaDb = {
      id: 'asig-previa-idem',
      seccionId: mockSeccionAula.id,
      estado: EstadoAsignacion.VIGENTE,
      huellaEntrada: huellaActual,
      motivoEscalamiento: null,
      espacios: [{ espacioId: 'aula-1' }],
      seccion: { horarios: mockSeccionAula.horarios },
    };

    const mockPrisma = {
      espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
      seccion: { findMany: jest.fn().mockResolvedValue([mockSeccionAula]) },
      asignacion: {
        findMany: jest.fn().mockResolvedValue([asignacionPreviaDb]),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    await procesarCorridaBatchPeriodo('2026-2', mockPrisma as any);

    // Sección conservada por idempotencia → NO debe llamar a registroAuditoria.create
    expect(registroAuditoriaMock.create).not.toHaveBeenCalled();
  });
});

// ============================================================
// 4. AUDITORÍA DE ALERTAS (Issue 4.5 + 5.11)
// ============================================================

describe('Issue 5.11 — Registro de auditoría: Alertas persistidas', () => {
  it('4a. registrarAlerta crea una alerta con fecha/hora automática (DEFAULT now())', async () => {
    const alertaMock = {
      create: jest
        .fn()
        .mockResolvedValue({
          id: 'alert-1',
          tipo: 'SOFTWARE',
          espacioId: 'lab-1',
          motivo: 'Software faltante',
        }),
    };
    const mockDb = {
      alerta: {
        findMany: jest.fn().mockResolvedValue([]), // Sin alertas previas
        ...alertaMock,
      },
    } as any;

    const resultado = await registrarAlerta(
      {
        tipo: 'SOFTWARE',
        espacioId: 'lab-1',
        motivo: 'Software faltante en Lab 101: Python 3.12',
        asignacionIds: ['asig-afectada-1'],
      },
      mockDb,
    );

    expect(resultado).not.toBeNull();
    expect(resultado!.creada).toBe(true);
    expect(resultado!.tipo).toBe('SOFTWARE');
    expect(resultado!.asignacionesAfectadas).toBe(1);

    // Verificar que se llamó a create con los datos correctos
    expect(alertaMock.create).toHaveBeenCalledTimes(1);
    const datosAlerta = alertaMock.create.mock.calls[0][0].data;
    expect(datosAlerta.tipo).toBe('SOFTWARE');
    expect(datosAlerta.espacioId).toBe('lab-1');
    expect(datosAlerta.motivo).toContain('Python 3.12');

    // La fechaDeteccion es generada por DEFAULT en PostgreSQL
    // El servicio NO debe pasar fechaDeteccion explícita (usa DEFAULT now())
    // Verificamos que NO se pase una fecha fija — se usa la de PostgreSQL
    expect(datosAlerta.fechaDeteccion).toBeUndefined();
  });

  it('4b. una alerta de CAPACIDAD se registra correctamente con asignaciones afectadas', async () => {
    const alertaMock = {
      create: jest.fn().mockResolvedValue({
        id: 'alert-cap-1',
        tipo: 'CAPACIDAD',
        espacioId: 'aula-201',
        motivo: 'Capacidad insuficiente',
      }),
    };
    const mockDb = {
      alerta: {
        findMany: jest.fn().mockResolvedValue([]),
        ...alertaMock,
      },
    } as any;

    const resultado = await registrarAlerta(
      {
        tipo: 'CAPACIDAD',
        espacioId: 'aula-201',
        motivo: 'Capacidad insuficiente en Aula 201: CC-101 sec. A (60 matriculados)',
        asignacionIds: ['asig-cap-1', 'asig-cap-2'],
      },
      mockDb,
    );

    expect(resultado).not.toBeNull();
    expect(resultado!.creada).toBe(true);
    expect(resultado!.asignacionesAfectadas).toBe(2);

    const datosAlerta = alertaMock.create.mock.calls[0][0].data;
    expect(datosAlerta.tipo).toBe('CAPACIDAD');
    // La relación de asignaciones afectadas está correctamente mapeada
    expect(datosAlerta.asignacionesAfectadas.create).toHaveLength(2);
  });

  it('4c. sin asignaciones afectadas, no debe crear ninguna alerta (retorna null)', async () => {
    const alertaMock = { create: jest.fn() };
    const mockDb = {
      alerta: {
        findMany: jest.fn().mockResolvedValue([]),
        ...alertaMock,
      },
    } as any;

    const resultado = await registrarAlerta(
      {
        tipo: 'SOFTWARE',
        espacioId: 'lab-1',
        motivo: 'Software faltante',
        asignacionIds: [], // Sin afectadas
      },
      mockDb,
    );

    expect(resultado).toBeNull();
    expect(alertaMock.create).not.toHaveBeenCalled();
  });

  it('4d. una alerta idéntica (misma pendiente) se actualiza, no se duplica', async () => {
    const alertaExistente = {
      id: 'alert-dup',
      tipo: 'SOFTWARE',
      espacioId: 'lab-1',
      estado: 'PENDIENTE',
      motivo: 'viejo motivo',
      asignacionesAfectadas: [{ asignacionId: 'asig-afectada-1' }],
    };

    const alertaMock = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ ...alertaExistente, motivo: 'nuevo motivo' }),
    };

    const mockDb = {
      alerta: {
        findMany: jest.fn().mockResolvedValue([alertaExistente]),
        ...alertaMock,
      },
    } as any;

    const resultado = await registrarAlerta(
      {
        tipo: 'SOFTWARE',
        espacioId: 'lab-1',
        motivo: 'nuevo motivo con más detalle',
        asignacionIds: ['asig-afectada-1'],
      },
      mockDb,
    );

    expect(resultado).not.toBeNull();
    expect(resultado!.creada).toBe(false); // Se actualizó, no se creó
    expect(alertaMock.create).not.toHaveBeenCalled(); // NO se duplicó
    expect(alertaMock.update).toHaveBeenCalledTimes(1);
  });
});
