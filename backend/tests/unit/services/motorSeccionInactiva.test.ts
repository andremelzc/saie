import { TipoEspacio } from '@prisma/client';
import { HttpError } from '../../../src/lib/http';
import {
  cargarSeccionInputPorId,
  procesarCorridaBatchPeriodo,
} from '../../../src/services/motor.service';

/** Issue 1.17 (R35): las secciones inactivas no entran al motor. */

const seccion = {
  id: 'sec-1',
  cursoId: 'cur-1',
  codigoSeccion: '1',
  periodo: '2026-2',
  tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
  softwareRequerido: [],
  curso: { codigo: 'CC-101', nombre: 'Algoritmos' },
  horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
  matriculas: [{ id: 'm1', movilidadReducida: false }],
};

describe('motor y secciones inactivas (Issue 1.17)', () => {
  it('cargarSeccionInputPorId rechaza con 409 una sección inactiva', async () => {
    const prisma = {
      seccion: { findUnique: jest.fn().mockResolvedValue({ ...seccion, activa: false }) },
    };

    const promesa = cargarSeccionInputPorId('sec-1', prisma as never);

    await expect(promesa).rejects.toBeInstanceOf(HttpError);
    await expect(promesa).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('inactiva'),
    });
  });

  it('cargarSeccionInputPorId carga una sección activa', async () => {
    const prisma = {
      seccion: { findUnique: jest.fn().mockResolvedValue({ ...seccion, activa: true }) },
    };
    const entrada = await cargarSeccionInputPorId('sec-1', prisma as never);
    expect(entrada?.codigoSeccion).toBe('1');
  });

  it('la corrida del periodo solo pide las secciones activas', async () => {
    const prisma = {
      espacio: { findMany: jest.fn().mockResolvedValue([]) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue([]) },
      seccion: { findMany: jest.fn().mockResolvedValue([]) },
      asignacion: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      asignacionEspacio: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      registroAuditoria: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn().mockImplementation(async (operaciones) => Promise.all(operaciones)),
    };

    await procesarCorridaBatchPeriodo('2026-2', prisma as never);

    expect(prisma.seccion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { periodo: '2026-2', activa: true } }),
    );
  });
});
