import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import {
  asignacionFueraDePiso1,
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
    softwareRequerido: [],
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
      // La corrida escribe con operaciones masivas dentro de una sola transacción por arreglo
      const mockPrisma = {
        espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
        espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
        seccion: { findMany: jest.fn().mockResolvedValue([mockSeccion]) },
        asignacion: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        asignacionEspacio: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        registroAuditoria: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        $transaction: jest.fn().mockImplementation(async (operaciones) => Promise.all(operaciones)),
      };

      const resultadoBatch = await procesarCorridaBatchPeriodo('2026-1', mockPrisma as any);

      expect(resultadoBatch.totalSecciones).toBe(1);
      expect(resultadoBatch.asignadas).toBe(1);
      expect(resultadoBatch.escaladas).toBe(0);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asignacion.createMany.mock.calls[0][0].data).toHaveLength(1);
      expect(mockPrisma.registroAuditoria.createMany.mock.calls[0][0].data).toHaveLength(1);
      // Por defecto la corrida es atendida: la pidió Coordinación.
      expect(mockPrisma.registroAuditoria.createMany.mock.calls[0][0].data[0].detalle).toContain(
        'Origen: DEMANDA',
      );
    });

    it('registra el origen TIEMPO cuando la dispara la tarea programada (Issue 2.18)', async () => {
      const mockPrisma = {
        espacio: { findMany: jest.fn().mockResolvedValue(mockEspacios) },
        espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
        seccion: { findMany: jest.fn().mockResolvedValue([mockSeccion]) },
        asignacion: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        asignacionEspacio: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        registroAuditoria: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        $transaction: jest.fn().mockImplementation(async (operaciones) => Promise.all(operaciones)),
      };

      await procesarCorridaBatchPeriodo('2026-1', mockPrisma as any, 'TIEMPO');

      expect(mockPrisma.registroAuditoria.createMany.mock.calls[0][0].data[0].detalle).toContain(
        'Origen: TIEMPO',
      );
    });
  });

  describe('alerta de accesibilidad (Issue 3.59, riesgo R10)', () => {
    // Solo hay espacios en el piso 2: una sección con movilidad reducida aplica el plan B.
    const espaciosPiso2 = mockEspacios.map((e) => ({
      ...e,
      piso: 2,
      distanciaAscensor: 10,
      softwareInstaladoCatalogo: [],
    }));
    const seccionConMovilidad = {
      ...mockSeccion,
      matriculas: [{ id: 'mat-1', movilidadReducida: true }],
    };

    function crearPrisma() {
      const prisma: any = {
        espacio: { findMany: jest.fn().mockResolvedValue(espaciosPiso2) },
        espacioContiguo: { findMany: jest.fn().mockResolvedValue(mockContiguos) },
        seccion: {
          findMany: jest.fn().mockResolvedValue([seccionConMovilidad]),
          findUnique: jest.fn().mockResolvedValue(seccionConMovilidad),
        },
        asignacion: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: 'asig-nueva' }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        asignacionEspacio: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        registroAuditoria: {
          create: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        alerta: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'al-1', ...data })),
        },
      };
      prisma.$transaction = jest
        .fn()
        .mockImplementation(async (arg: any) =>
          typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
        );
      return prisma;
    }

    const motivoEsperado = expect.stringContaining(
      'tiene alumnos con movilidad reducida y quedó en el piso 2',
    );

    it('la corrida completa alerta cuando una sección con movilidad queda fuera del piso 1', async () => {
      const prisma = crearPrisma();

      await procesarCorridaBatchPeriodo('2026-1', prisma);

      expect(prisma.alerta.create).toHaveBeenCalledTimes(1);
      expect(prisma.alerta.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tipo: 'ACCESIBILIDAD', motivo: motivoEsperado }),
      });
    });

    it('la asignación de una sección también alerta', async () => {
      const prisma = crearPrisma();

      await procesarAsignacionSeccionIndividual('sec-1', prisma);

      expect(prisma.alerta.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: 'ACCESIBILIDAD',
          motivo: motivoEsperado,
          asignacionesAfectadas: { create: [{ asignacionId: 'asig-nueva' }] },
        }),
      });
    });

    it('no alerta si la sección consigue el piso 1', async () => {
      const prisma = crearPrisma();
      prisma.espacio.findMany.mockResolvedValue(mockEspacios);

      await procesarCorridaBatchPeriodo('2026-1', prisma);

      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    describe('asignacionFueraDePiso1', () => {
      const espacio = { ...espaciosPiso2[0] } as any;
      const seccion = { id: 'sec-1', codigoSeccion: 'SEC-101', codigoCurso: '20201' } as any;
      const resultado = (cambios: Record<string, unknown> = {}) =>
        ({
          seccionId: 'sec-1',
          codigoSeccion: 'SEC-101',
          cursoId: 'cur-1',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-1'],
          huellaEntrada: 'h',
          fallbackPiso1Aplicado: true,
          ...cambios,
        }) as any;

      it('devuelve los datos de la alerta cuando se aplicó el plan B', () => {
        expect(asignacionFueraDePiso1(resultado(), 'a1', seccion, [espacio])).toEqual({
          asignacionId: 'a1',
          codigoCurso: '20201',
          codigoSeccion: 'SEC-101',
          espacio: { id: 'aula-1', identificador: 'Aula 101', piso: 2 },
        });
      });

      it('no devuelve nada sin plan B, si está escalada o si faltan datos', () => {
        expect(
          asignacionFueraDePiso1(resultado({ fallbackPiso1Aplicado: false }), 'a1', seccion, [
            espacio,
          ]),
        ).toBeNull();
        expect(
          asignacionFueraDePiso1(resultado({ estado: EstadoAsignacion.ESCALADA }), 'a1', seccion, [
            espacio,
          ]),
        ).toBeNull();
        expect(asignacionFueraDePiso1(resultado(), 'a1', undefined, [espacio])).toBeNull();
        expect(asignacionFueraDePiso1(resultado(), 'a1', seccion, [])).toBeNull();
      });

      it('usa un código de curso vacío si la sección no lo trae', () => {
        const sinCurso = { ...seccion, codigoCurso: undefined };
        expect(asignacionFueraDePiso1(resultado(), 'a1', sinCurso, [espacio])?.codigoCurso).toBe(
          '',
        );
      });
    });
  });
});
