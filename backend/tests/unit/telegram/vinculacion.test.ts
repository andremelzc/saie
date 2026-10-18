import {
  desvincularPorAlumno,
  obtenerVinculacionDeAlumno,
} from '../../../src/telegram/vinculacion.service';

describe('Vinculación de Telegram: lectura y baja por alumno (Issue 3.28)', () => {
  it('devuelve null si el alumno nunca vinculó su cuenta', async () => {
    const prisma = { vinculacionTelegram: { findUnique: jest.fn().mockResolvedValue(null) } };

    await expect(obtenerVinculacionDeAlumno('alu-1', prisma as any)).resolves.toBeNull();
    expect(prisma.vinculacionTelegram.findUnique).toHaveBeenCalledWith({
      where: { alumnoId: 'alu-1' },
    });
  });

  it('devuelve el estado de la vinculación (activa o de baja)', async () => {
    const fecha = new Date('2026-03-01T12:00:00.000Z');
    const prisma = {
      vinculacionTelegram: {
        findUnique: jest.fn().mockResolvedValue({
          activo: true,
          fechaVinculacion: fecha,
          fechaBaja: null,
        }),
      },
    };

    await expect(obtenerVinculacionDeAlumno('alu-1', prisma as any)).resolves.toEqual({
      activo: true,
      fechaVinculacion: fecha,
      fechaBaja: null,
    });
  });

  it('da de baja solo la vinculación activa del propio alumno', async () => {
    const prisma = {
      vinculacionTelegram: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };

    await expect(desvincularPorAlumno('alu-1', prisma as any)).resolves.toBe(true);
    expect(prisma.vinculacionTelegram.updateMany).toHaveBeenCalledWith({
      where: { alumnoId: 'alu-1', activo: true },
      data: { activo: false, fechaBaja: expect.any(Date) },
    });
  });

  it('es idempotente: sin vinculación activa devuelve false', async () => {
    const prisma = {
      vinculacionTelegram: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    await expect(desvincularPorAlumno('alu-1', prisma as any)).resolves.toBe(false);
  });
});
