import { logger } from '../../../src/lib/logger';
import { ejecutarImportacion } from '../../../src/services/importacion.service';
import {
  importacionEnCurso,
  iniciarTrabajoImportacion,
  obtenerTrabajoImportacion,
  reiniciarTrabajosImportacion,
} from '../../../src/services/trabajosImportacion';

jest.mock('../../../src/services/importacion.service', () => ({ ejecutarImportacion: jest.fn() }));

const prisma = {} as any;
const importar = ejecutarImportacion as jest.Mock;
const RESULTADO = { tipo: 'matriculas', exitosa: true, errores: [] } as any;

/** Importación que termina cuando el test lo decide y reporta avance. */
function importacionControlada() {
  let terminar!: (valor: unknown) => void;
  let fallar!: (error: Error) => void;
  let avance: ((h: number, t: number) => void) | undefined;
  importar.mockImplementationOnce(
    (_tipo: string, _filas: unknown[], _prisma: unknown, _cuenta: unknown, onProgreso: any) => {
      avance = onProgreso;
      return new Promise((resolve, reject) => {
        terminar = resolve;
        fallar = reject;
      });
    },
  );
  return {
    terminar: (v: unknown = RESULTADO) => terminar(v),
    fallar: (e: Error) => fallar(e),
    avance: (h: number, t: number) => avance?.(h, t),
  };
}

beforeEach(() => {
  reiniciarTrabajosImportacion();
  importar.mockReset();
});

describe('Importaciones en segundo plano (Issue 1.19, R39)', () => {
  it('queda EN_CURSO, informa el avance y termina con el resultado', async () => {
    const control = importacionControlada();
    const { trabajo, terminado } = iniciarTrabajoImportacion('matriculas', [{}, {}], prisma, 'c1');

    expect(trabajo).toMatchObject({ estado: 'EN_CURSO', procesadas: 0, total: 2 });
    expect(importacionEnCurso('matriculas')).toBe(true);

    control.avance(1, 2);
    expect(obtenerTrabajoImportacion(trabajo.id, 'c1')).toMatchObject({ procesadas: 1, total: 2 });

    control.terminar();
    const final = await terminado;

    expect(final).toMatchObject({ estado: 'TERMINADO', procesadas: 2, resultado: RESULTADO });
    expect(importacionEnCurso('matriculas')).toBe(false);
  });

  it('rechaza con 409 otra importación del mismo tipo mientras hay una en curso', () => {
    importacionControlada();
    iniciarTrabajoImportacion('matriculas', [{}], prisma, 'c1');

    expect(() => iniciarTrabajoImportacion('matriculas', [{}], prisma, 'c1')).toThrow(
      expect.objectContaining({ status: 409 }),
    );
    expect(importar).toHaveBeenCalledTimes(1);
  });

  it('permite otro tipo a la vez y el mismo tipo cuando la anterior terminó', async () => {
    const primera = importacionControlada();
    const { terminado } = iniciarTrabajoImportacion('matriculas', [{}], prisma, 'c1');

    importacionControlada();
    expect(() => iniciarTrabajoImportacion('horarios', [{}], prisma, 'c1')).not.toThrow();

    primera.terminar();
    await terminado;
    importacionControlada();
    expect(() => iniciarTrabajoImportacion('matriculas', [{}], prisma, 'c1')).not.toThrow();
  });

  it('un fallo inesperado deja el trabajo FALLIDO sin filtrar el detalle y libera el tipo', async () => {
    const consola = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const control = importacionControlada();
    const { trabajo, terminado } = iniciarTrabajoImportacion('matriculas', [{}], prisma, 'c1');

    control.fallar(new Error('conexión a la base caída'));
    const final = await terminado;

    expect(final.estado).toBe('FALLIDO');
    expect(JSON.stringify(final)).not.toContain('conexión');
    expect(obtenerTrabajoImportacion(trabajo.id, 'c1').error).toContain('falló');
    expect(importacionEnCurso('matriculas')).toBe(false);
    consola.mockRestore();
  });

  it('solo quien inició la importación puede consultarla (404 para otro o si no existe)', () => {
    importacionControlada();
    const { trabajo } = iniciarTrabajoImportacion('matriculas', [{}], prisma, 'c1');

    expect(() => obtenerTrabajoImportacion(trabajo.id, 'c2')).toThrow(
      expect.objectContaining({ status: 404 }),
    );
    expect(() => obtenerTrabajoImportacion('no-existe', 'c1')).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it('descarta los trabajos terminados hace más de una hora', async () => {
    const control = importacionControlada();
    const { trabajo, terminado } = iniciarTrabajoImportacion('matriculas', [{}], prisma, 'c1');
    control.terminar();
    await terminado;

    const ahora = Date.now();
    const reloj = jest.spyOn(Date, 'now').mockReturnValue(ahora + 61 * 60 * 1000);
    importacionControlada();
    iniciarTrabajoImportacion('docentes', [{}], prisma, 'c1');

    expect(() => obtenerTrabajoImportacion(trabajo.id, 'c1')).toThrow(
      expect.objectContaining({ status: 404 }),
    );
    reloj.mockRestore();
  });
});
