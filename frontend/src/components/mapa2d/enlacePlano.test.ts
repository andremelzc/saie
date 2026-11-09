import { describe, expect, it } from 'vitest';
import {
  avisosDeCruce,
  crearEnlacePlano,
  espaciosDesdeOcupacion,
  prefijoDePabellon,
  rutaConIdsDePlano,
} from './enlacePlano';
import { PLANOS_SVG } from './planos';
import type { RutaReferencia } from '../ruta/tipos';

const NUEVO = 'Nuevo Pabellón';
const ANTIGUO = 'Antiguo Pabellón';

const aulas = (pabellon: string, desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => ({
    pabellon,
    identificador: `Aula ${desde + i}`,
  }));
const con = (pabellon: string, ...nombres: string[]) =>
  nombres.map((identificador) => ({ pabellon, identificador }));

/** Espacios de la BD (los 54 que tiene el seed), solo pabellón e identificador. */
const ESPACIOS_BD = [
  ...aulas(NUEVO, 101, 109),
  ...aulas(NUEVO, 201, 205),
  ...con(NUEVO, 'Aula 206 - Data center', 'Aula 207 - Laboratorio 01', 'Aula 208 - Laboratorio 02', 'Aula 209 - Laboratorio 03'),
  ...con(NUEVO, 'Aula 301', 'Aula 302', 'Aula 303 - Laboratorio 04', 'Aula 304 - Laboratorio 05', 'Aula 305 - Laboratorio 06', 'Aula 306 - Laboratorio 07', 'Aula 307 - Laboratorio 08'),
  ...aulas(ANTIGUO, 101, 103),
  ...con(ANTIGUO, 'Aula 104 - Laboratorio 08'),
  ...aulas(ANTIGUO, 105, 109),
  ...con(ANTIGUO, 'Aula 110 - Laboratorio 11'),
  ...aulas(ANTIGUO, 201, 205),
  ...con(ANTIGUO, 'Aula 206 - Laboratorio 09', 'Aula 207', 'Aula 208 y 209 - Aula Magna'),
  ...aulas(ANTIGUO, 210, 213),
  ...con(ANTIGUO, 'Aula 301', 'Aula 302 - Laboratorio 06', 'Aula 303 - Laboratorio 05', 'Aula 304 - Laboratorio 01', 'Aula 305 - Laboratorio 02', 'Aula 306 - Laboratorio 03', 'Aula 307 - Laboratorio 04'),
];

const enlace = crearEnlacePlano(PLANOS_SVG);

describe('prefijoDePabellon', () => {
  it('traduce los dos pabellones reales, sin importar tildes ni mayúsculas', () => {
    expect(prefijoDePabellon('Nuevo Pabellón')).toBe('NUE');
    expect(prefijoDePabellon('antiguo pabellon')).toBe('ANT');
  });

  it('devuelve null para un pabellón desconocido', () => {
    expect(prefijoDePabellon('Pabellón C')).toBeNull();
  });
});

describe('enlace con los planos reales', () => {
  it('traduce pabellón y nombre al id de la figura', () => {
    expect(enlace.idDeEspacio(NUEVO, 'Aula 204')).toBe('NUE-204');
    expect(enlace.idDeEspacio(ANTIGUO, 'Aula 204')).toBe('ANT-204');
    expect(enlace.idDeEspacio(ANTIGUO, 'Aula 104 - Laboratorio 08')).toBe('ANT-104');
    expect(enlace.idDeEspacio(ANTIGUO, 'Aula 208 y 209 - Aula Magna')).toBe('ANT-208-209');
  });

  it('un nombre repetido en los dos pabellones no se confunde', () => {
    expect(enlace.idDeEspacio(NUEVO, 'Aula 101')).toBe('NUE-101');
    expect(enlace.idDeEspacio(ANTIGUO, 'Aula 101')).toBe('ANT-101');
  });

  it('devuelve null si el plano no dibuja el espacio o el pabellón no existe', () => {
    expect(enlace.idDeEspacio(NUEVO, 'Aula 301')).toBeNull();
    expect(enlace.idDeEspacio('Pabellón C', 'Aula 101')).toBeNull();
  });

  it('ninguna figura de aula o laboratorio tiene un nombre ambiguo', () => {
    expect(enlace.ambiguos).toEqual([]);
  });
});

describe('cruce entre la BD y el plano', () => {
  it('todos los espacios de la BD tienen figura, salvo 301 y 302 del pabellón nuevo', () => {
    const cruce = avisosDeCruce(ESPACIOS_BD, enlace);
    expect(cruce.espaciosSinFigura).toEqual([`${NUEVO} · Aula 301`, `${NUEVO} · Aula 302`]);
  });

  it('todas las figuras de aula y laboratorio tienen su espacio en la BD', () => {
    expect(avisosDeCruce(ESPACIOS_BD, enlace).figurasSinEspacio).toEqual([]);
  });

  it('avisa de las figuras que ningún espacio reclama', () => {
    const sinUno = ESPACIOS_BD.filter(
      (e) => !(e.pabellon === ANTIGUO && e.identificador === 'Aula 213'),
    );
    expect(avisosDeCruce(sinUno, enlace).figurasSinEspacio).toEqual(['ANT-213']);
  });
});

describe('espaciosDesdeOcupacion', () => {
  const dto = {
    pabellon: ANTIGUO,
    piso: 1,
    espacios: [
      { identificador: 'Aula 101', tipo: 'AULA_TEORICA' as const, estado: 'OCUPADO' as const, aforoNominal: 40 },
      { identificador: 'Aula 104 - Laboratorio 08', tipo: 'LABORATORIO' as const, estado: 'DISPONIBLE' as const },
      { identificador: 'Aula 199', tipo: 'AULA_TEORICA' as const, estado: 'DISPONIBLE' as const },
    ],
  };

  it('usa el id de la figura y conserva nombre, piso y aforo', () => {
    const { espacios } = espaciosDesdeOcupacion(dto, enlace);
    expect(espacios.map((e) => e.id)).toEqual(['ANT-101', 'ANT-104']);
    expect(espacios[0]).toMatchObject({
      nombre: 'Aula 101',
      piso: 1,
      aforo: 40,
      estado: 'OCUPADO',
      tipo: 'AULA_TEORICA',
    });
  });

  it('lista aparte lo que el plano no dibuja', () => {
    expect(espaciosDesdeOcupacion(dto, enlace).sinFigura).toEqual([`${ANTIGUO} · Aula 199`]);
  });

  it('deja fuera los deshabilitados y los informa por separado', () => {
    const r = espaciosDesdeOcupacion(
      {
        pabellon: ANTIGUO,
        piso: 2,
        espacios: [{ identificador: 'Aula 207', tipo: 'AULA_TEORICA', estado: 'DESHABILITADO' }],
      },
      enlace,
    );
    expect(r.espacios).toEqual([]);
    expect(r.deshabilitados).toEqual(['ANT-207']);
  });
});

describe('rutaConIdsDePlano', () => {
  const base: RutaReferencia = {
    estado: 'DISPONIBLE',
    tiempoEstimadoTotalSegundos: 135,
    movilidadReducida: false,
    tramos: [
      { orden: 1, tipo: 'ENTRADA_PABELLON', titulo: 'Entrada', descripcion: '', tiempoEstimadoSegundos: 45, esAccesible: true },
      {
        orden: 2,
        tipo: 'ESPACIO_ASIGNADO',
        titulo: 'Aula',
        descripcion: '',
        tiempoEstimadoSegundos: 30,
        esAccesible: true,
        espacioId: '9f2c1e0a-uuid',
        identificador: 'Aula 104 - Laboratorio 08',
        pabellon: ANTIGUO,
        piso: 1,
      },
    ],
  };

  it('cambia el UUID del tramo por el id de la figura', () => {
    const r = rutaConIdsDePlano(base, enlace, PLANOS_SVG);
    expect(r.tramos[1].espacioId).toBe('ANT-104');
    expect(r.tramos[0]).toEqual(base.tramos[0]);
  });

  it('quita el espacioId si el plano no dibuja el espacio', () => {
    const sinFigura: RutaReferencia = {
      ...base,
      tramos: [{ ...base.tramos[1], pabellon: NUEVO, identificador: 'Aula 301' }],
    };
    expect(rutaConIdsDePlano(sinFigura, enlace, PLANOS_SVG).tramos[0].espacioId).toBeUndefined();
  });

  it('no toca un espacioId que ya es el de una figura (datos de ejemplo)', () => {
    const ejemplo: RutaReferencia = {
      ...base,
      tramos: [{ ...base.tramos[1], espacioId: 'NUE-204' }],
    };
    expect(rutaConIdsDePlano(ejemplo, enlace, PLANOS_SVG).tramos[0].espacioId).toBe('NUE-204');
  });
});
