jest.mock('../../../src/services/motor.service', () => ({
  cargarContextoEspacios: jest.fn(),
}));

import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import { cargarContextoEspacios } from '../../../src/services/motor.service';
import { verificarCorridaPeriodo } from '../../../src/services/verificador.service';

const contexto = {
  todosLosEspacios: [
    {
      id: 'e1',
      identificador: 'Aula 101',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'A',
      piso: 1,
      aforoNominal: 40,
      pcsMalogradas: 0,
      softwareInstalado: [],
    },
  ] as EspacioConexo[],
  obtenerVecinos: () => [] as string[],
};

function fila(matriculas = 2) {
  return {
    id: 'asig-1',
    seccionId: 's1',
    estado: EstadoAsignacion.VIGENTE,
    motivoEscalamiento: null,
    espacios: [{ espacioId: 'e1' }],
    seccion: {
      codigoSeccion: '1',
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      stackSoftwareRequerido: [],
      matriculas: Array.from({ length: matriculas }, (_, i) => ({ id: `m${i}` })),
      horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
    },
  };
}

function prismaMock(filas: unknown[]) {
  return {
    asignacion: { findMany: jest.fn().mockResolvedValue(filas) },
    registroAuditoria: { create: jest.fn().mockResolvedValue({}) },
  } as any;
}

function detalleAuditado(prisma: any): string {
  return prisma.registroAuditoria.create.mock.calls[0][0].data.detalle;
}

beforeEach(() => {
  jest.clearAllMocks();
  (cargarContextoEspacios as jest.Mock).mockResolvedValue(contexto);
});

describe('Issue 2.17 - Servicio del verificador de corrida', () => {
  it('arma las entradas desde el estado persistido y registra la verificación conforme', async () => {
    const prisma = prismaMock([fila()]);

    const res = await verificarCorridaPeriodo('2026-1', prisma, 'corrida-9');

    expect(cargarContextoEspacios).toHaveBeenCalledWith(prisma);
    expect(prisma.asignacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          seccion: { periodo: '2026-1' },
          estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
        },
      }),
    );
    expect(res).toMatchObject({ conforme: true, totalRevisadas: 1, totalViolaciones: 0 });
    expect(prisma.registroAuditoria.create).toHaveBeenCalledTimes(1);
    expect(prisma.registroAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipoEvento: 'VERIFICACION' }),
      }),
    );
    expect(detalleAuditado(prisma)).toContain('conforme');
    expect(detalleAuditado(prisma)).toContain('corrida-9');
  });

  it('registra en la auditoría las reglas incumplidas cuando no es conforme', async () => {
    const prisma = prismaMock([fila(100)]);

    const res = await verificarCorridaPeriodo('2026-1', prisma);

    expect(res.conforme).toBe(false);
    expect(detalleAuditado(prisma)).toContain('CAPACIDAD_SUFICIENTE');
    expect(detalleAuditado(prisma)).toContain('1 violación(es)');
  });

  it('funciona sin id de corrida (verificación disparada por sección)', async () => {
    const prisma = prismaMock([]);

    const res = await verificarCorridaPeriodo('2026-1', prisma);

    expect(res).toMatchObject({ conforme: true, totalRevisadas: 0 });
    expect(detalleAuditado(prisma)).not.toContain('corrida');
  });
});
