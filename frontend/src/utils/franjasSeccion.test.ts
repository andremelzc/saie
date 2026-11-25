import { describe, expect, it } from 'vitest';
import {
  aFranjasEditables,
  mensajeGuardadoSeccion,
  mismasFranjas,
  nuevaFranja,
  validarFranjas,
} from './franjasSeccion';
import type { ResultadoEdicionSeccionDTO } from '../types/admin';

describe('franjasSeccion (Issue 4.62)', () => {
  const editables = (...f: [string, string, string][]) =>
    aFranjasEditables(
      f.map(([diaSemana, horaInicio, horaFin]) => ({
        diaSemana: diaSemana as 'LUNES',
        horaInicio,
        horaFin,
      })),
    );

  it('acepta franjas válidas, aunque compartan día sin cruzarse', () => {
    expect(
      validarFranjas(editables(['LUNES', '08:00', '10:00'], ['LUNES', '10:00', '12:00'])),
    ).toEqual({});
  });

  it('rechaza un inicio igual o posterior al fin y horas vacías', () => {
    const [igual, despues, vacia] = editables(
      ['LUNES', '10:00', '10:00'],
      ['MARTES', '12:00', '10:00'],
      ['MIERCOLES', '', '10:00'],
    );
    const errores = validarFranjas([igual, despues, vacia]);
    expect(errores[igual.clave]).toContain('anterior');
    expect(errores[despues.clave]).toContain('anterior');
    expect(errores[vacia.clave]).toContain('HH:mm');
  });

  it('marca la segunda de dos franjas que se cruzan', () => {
    const [a, b] = editables(['LUNES', '08:00', '10:00'], ['LUNES', '09:00', '11:00']);
    const errores = validarFranjas([a, b]);
    expect(errores[a.clave]).toBeUndefined();
    expect(errores[b.clave]).toBe('Se cruza con la franja Lunes 08:00 – 10:00.');
  });

  it('compara franjas sin importar el orden ni los segundos', () => {
    expect(
      mismasFranjas(
        [
          { diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' },
          { diaSemana: 'LUNES', horaInicio: '08:00:00', horaFin: '10:00:00' },
        ],
        [
          { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
          { diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' },
        ],
      ),
    ).toBe(true);
  });

  it('la franja nueva va al día siguiente de la última', () => {
    expect(nuevaFranja([]).diaSemana).toBe('LUNES');
    expect(nuevaFranja(editables(['LUNES', '08:00', '10:00'])).diaSemana).toBe('MARTES');
    expect(nuevaFranja(editables(['SABADO', '08:00', '10:00'])).diaSemana).toBe('LUNES');
  });

  describe('mensajeGuardadoSeccion', () => {
    const base: ResultadoEdicionSeccionDTO = {
      seccion: {} as never,
      alertas: [],
      advertencias: [],
      reasignacion: null,
    };

    it('sin cambio de horario ni alertas: «Sección actualizada.»', () => {
      expect(mensajeGuardadoSeccion(base)).toEqual({
        tono: 'exito',
        texto: 'Sección actualizada.',
      });
    });

    it('explica si la sección quedó en revisión al reasignarla', () => {
      expect(
        mensajeGuardadoSeccion({
          ...base,
          reasignacion: {
            estado: 'ESCALADA',
            motivoEscalamiento: 'No hay laboratorio libre',
            conservada: false,
          },
        }),
      ).toEqual({
        tono: 'info',
        texto: 'El horario se guardó, pero la sección quedó en revisión: No hay laboratorio libre.',
      });
    });
  });
});
