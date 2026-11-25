import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import {
  claveCursoPeriodo,
  importarCursosYSecciones,
} from '../../../src/importers/cursosSecciones.importer';

/**
 * Issue 1.17 (R35): las secciones de un curso y periodo del archivo que ya no figuran en él
 * quedan inactivas y su asignación pasa a HISTORICA; las que vuelven a figurar se reactivan.
 */

const fila = (codigoSeccion: string) => ({
  codigoCurso: 'CC-101',
  nombreCurso: 'Algoritmos',
  codigoSeccion,
  periodo: '2026-2',
  tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
});

function crearPrisma(ausentes: { id: string }[]) {
  const prisma = {
    curso: { upsert: jest.fn().mockResolvedValue({ id: 'curso-1' }) },
    seccion: {
      upsert: jest
        .fn()
        .mockImplementation(({ create }) => Promise.resolve({ id: `sec-${create.codigoSeccion}` })),
      findMany: jest.fn().mockResolvedValue(ausentes),
      updateMany: jest.fn().mockReturnValue('actualizar-secciones'),
    },
    asignacion: { updateMany: jest.fn().mockReturnValue('actualizar-asignaciones') },
    software: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return prisma;
}

describe('importarCursosYSecciones: secciones que dejan de figurar (Issue 1.17)', () => {
  it('reactiva las secciones del archivo', async () => {
    const prisma = crearPrisma([]);
    await importarCursosYSecciones([fila('1')], prisma as never);
    expect(prisma.seccion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ activa: true }) }),
    );
  });

  it('inactiva las ausentes de cada curso y periodo y pasa su asignación a HISTORICA', async () => {
    const prisma = crearPrisma([{ id: 'sec-4' }, { id: 'sec-5' }]);

    const resultado = await importarCursosYSecciones([fila('1'), fila('2')], prisma as never);

    expect(resultado.seccionesInactivadas).toBe(2);
    expect(prisma.seccion.findMany).toHaveBeenCalledWith({
      where: {
        cursoId: 'curso-1',
        periodo: '2026-2',
        activa: true,
        id: { notIn: ['sec-1', 'sec-2'] },
      },
      select: { id: true },
    });
    expect(prisma.seccion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['sec-4', 'sec-5'] } },
      data: { activa: false },
    });
    expect(prisma.asignacion.updateMany).toHaveBeenCalledWith({
      where: {
        seccionId: { in: ['sec-4', 'sec-5'] },
        estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
      },
      data: { estado: EstadoAsignacion.HISTORICA },
    });
    // Las dos actualizaciones van en una sola transacción.
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'actualizar-secciones',
      'actualizar-asignaciones',
    ]);
  });

  it('sin ausentes no abre ninguna transacción', async () => {
    const prisma = crearPrisma([]);
    const resultado = await importarCursosYSecciones([fila('1')], prisma as never);
    expect(resultado.seccionesInactivadas).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('si alguna fila falla no inactiva nada', async () => {
    const prisma = crearPrisma([{ id: 'sec-4' }]);
    const resultado = await importarCursosYSecciones(
      [fila('1'), { codigoCurso: '' }],
      prisma as never,
    );
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.seccionesInactivadas).toBe(0);
    expect(prisma.seccion.findMany).not.toHaveBeenCalled();
  });

  it('claveCursoPeriodo une el curso y el periodo', () => {
    expect(claveCursoPeriodo('curso-1', '2026-2')).toBe('curso-1|2026-2');
  });
});
