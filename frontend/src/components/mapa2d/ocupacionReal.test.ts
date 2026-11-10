import { describe, expect, it, vi } from 'vitest';
import { cargarOcupacionEdificio, type PedirOcupacion } from './ocupacionReal';

const FRANJA = { dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00' } as const;

describe('cargarOcupacionEdificio', () => {
  it('pide cada pabellón en cada piso con la franja y junta los espacios con el id del plano', async () => {
    const pedir = vi.fn<PedirOcupacion>(async (pabellon, piso) => ({
      pabellon,
      piso,
      espacios:
        piso === 1
          ? [{ identificador: 'Aula 101', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE' }]
          : [],
    }));

    const r = await cargarOcupacionEdificio(pedir, FRANJA);

    expect(pedir).toHaveBeenCalledTimes(6);
    expect(pedir).toHaveBeenCalledWith('Nuevo Pabellón', 1, FRANJA);
    expect(pedir).toHaveBeenCalledWith('Antiguo Pabellón', 3, FRANJA);
    expect(r.espacios.map((e) => e.id).sort()).toEqual(['ANT-101', 'NUE-101']);
  });

  it('reúne lo que el plano no dibuja y lo deshabilitado de todas las respuestas', async () => {
    const pedir: PedirOcupacion = async (pabellon, piso) => ({
      pabellon,
      piso,
      espacios:
        pabellon === 'Antiguo Pabellón' && piso === 2
          ? [
              { identificador: 'Aula 207', tipo: 'AULA_TEORICA', estado: 'DESHABILITADO' },
              { identificador: 'Aula 999', tipo: 'AULA_TEORICA', estado: 'OCUPADO' },
            ]
          : [],
    });

    const r = await cargarOcupacionEdificio(pedir, null);

    expect(r.deshabilitados).toEqual(['ANT-207']);
    expect(r.sinFigura).toEqual(['Antiguo Pabellón · Aula 999']);
    expect(r.espacios).toEqual([]);
  });

  it('si una consulta falla, falla todo (no se muestra un mapa a medias)', async () => {
    const pedir: PedirOcupacion = async (_p, piso) => {
      if (piso === 2) throw new Error('sin red');
      return { pabellon: 'x', piso, espacios: [] };
    };

    await expect(cargarOcupacionEdificio(pedir, null)).rejects.toThrow('sin red');
  });
});
