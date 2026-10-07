import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import {
  cargarContextoEspacios,
  cargarSeccionInputPorId,
  procesarAsignacionSeccionIndividual,
  procesarCorridaBatchPeriodo,
} from '../../../src/services/motor.service';

describe('Motor Service con Prisma (Issue 2.10 & 2.11 & 2.15)', () => {
  const mockEspacios = [
    {
      id: 'aula-1',
      identificador: 'Aula 101',
      pabellon: 'Pab-1',
      piso: 1,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 30,
      pcsMalogradas: null,
      softwareInstalado: [],
    },
    {
      id: 'aula-2',
      identificador: 'Aula 102',
      pabellon: 'Pab-1',
      piso: 1,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 30,
      pcsMalogradas: null,
      softwareInstalado: [],
    },
  ];

  const mockContiguos = [{ espacioIdA: 'aula-1', espacioIdB: 'aula-2' }];

  const mockSeccion = {
    id: 'sec-1',
    cursoId: 'cur-1',
    codigoSeccion: 'SEC-101',
    periodo: '2026-1',
    tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
    stackSoftwareRequerido: [],
    curso: { codigo: '20201', nombre: 'Algoritmos' },
    horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
    matriculas: [{ id: 'mat-1', movilidadReducida: false }],
  };

  describe('cargarContextoEspacios', () => {
    it('debe cargar espacios y función de vecinos contiguos', async () => {
      const mockPrisma = {
        espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
        espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
      };

      const contexto = await cargarContextoEspacios(mockPrisma as any);
      expect(contexto.todosLosEspacios).toHaveLength(2);
      expect(contexto.obtenerVecinos('aula-1')).toEqual(['aula-2']);
    });
  });

  describe('cargarSeccionInputPorId', () => {
    it('debe mapear correctamente los campos de la sección y matrícula', async () => {
      const mockPrisma = {
        seccion: { findUnique: jest.fn().mockResolvedValue(mockSeccion) },
      };

      const seccionInput = await cargarSeccionInputPorId('sec-1', mockPrisma as any);
      expect(seccionInput).toBeDefined();
      expect(seccionInput?.alumnosMatriculados).toBe(1);
      expect(seccionInput?.movilidadReducida).toBe(false);
      expect(seccionInput?.horarios).toHaveLength(1);
    });

    it('debe retornar null si la sección no existe', async () => {
      const mockPrisma = {
        seccion: { findUnique: jest.fn().mockResolvedValue(null) },
      };

      const seccionInput = await cargarSeccionInputPorId('sec-inexistente', mockPrisma as any);
      expect(seccionInput).toBeNull();
    });
  });

  describe('procesarAsignacionSeccionIndividual', () => {
    it('debe ejecutar asignación individual y persistirla en una transacción', async () => {
      const mockTx = {
        asignacion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: 'asig-nueva-1' }),
        },
        registroAuditoria: {
          create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      const mockPrisma = {
        seccion: { findUnique: jest.fn().mockResolvedValue(mockSeccion) },
        espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
        espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
        asignacion: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        $transaction: jest.fn().mockImplementation(async (callback) => callback(mockTx)),
      };

      const resultado = await procesarAsignacionSeccionIndividual('sec-1', mockPrisma as any);

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['aula-1']);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.asignacion.create).toHaveBeenCalled();
      expect(mockTx.registroAuditoria.create).toHaveBeenCalled();
    });
  });

  describe('procesarCorridaBatchPeriodo', () => {
    it('debe procesar todas las secciones del periodo y persistir el lote', async () => {
      const mockTx = {
        asignacion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: 'asig-batch-1' }),
        },
        registroAuditoria: {
          create: jest.fn().mockResolvedValue({ id: 'audit-batch-1' }),
        },
      };

      const mockPrisma = {
        espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
        espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
        seccion: { findMany: jest.fn().mockResolvedValue([mockSeccion]) },
        asignacion: { findMany: jest.fn().mockResolvedValue([]) },
        $transaction: jest.fn().mockImplementation(async (callback) => callback(mockTx)),
      };

      const resultadoBatch = await procesarCorridaBatchPeriodo('2026-1', mockPrisma as any);

      expect(resultadoBatch.totalSecciones).toBe(1);
      expect(resultadoBatch.asignadas).toBe(1);
      expect(resultadoBatch.escaladas).toBe(0);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
