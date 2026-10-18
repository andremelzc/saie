import { DiaSemana } from '@prisma/client';
import { z } from 'zod';
import {
  filtrosDeMapa,
  franjaCompleta,
  franjaOrdenada,
  franjaShape,
  MapaOcupacionQuerySchema,
  MENSAJE_FRANJA_DESORDENADA,
  MENSAJE_FRANJA_INCOMPLETA,
} from '../../../src/lib/franja';

describe('Lib: franja (Issue 3.13 / 4.12)', () => {
  describe('franjaShape schema', () => {
    const TestSchema = z.object({
      ...franjaShape,
    });

    it('acepta dia undefined', () => {
      const res = TestSchema.safeParse({});
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.dia).toBeUndefined();
      }
    });

    it('normaliza un dia valido', () => {
      const res = TestSchema.safeParse({ dia: 'LUNES' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.dia).toBe(DiaSemana.LUNES);
      }
    });

    it('rechaza un dia invalido con mensaje descriptivo', () => {
      const res = TestSchema.safeParse({ dia: 'DIA_FALSO' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('El día indicado no es válido');
      }
    });
  });

  describe('franjaCompleta', () => {
    it('retorna true cuando los tres campos estan presentes', () => {
      expect(franjaCompleta({ dia: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' })).toBe(
        true,
      );
    });

    it('retorna true cuando ninguno de los tres campos esta presente', () => {
      expect(franjaCompleta({})).toBe(true);
    });

    it('retorna false cuando solo esta el dia', () => {
      expect(franjaCompleta({ dia: DiaSemana.LUNES })).toBe(false);
    });

    it('retorna false cuando solo estan las horas sin dia', () => {
      expect(franjaCompleta({ horaInicio: '08:00', horaFin: '10:00' })).toBe(false);
    });

    it('retorna false cuando falta solo horaFin', () => {
      expect(franjaCompleta({ dia: DiaSemana.LUNES, horaInicio: '08:00' })).toBe(false);
    });
  });

  describe('franjaOrdenada', () => {
    it('retorna true si horaInicio < horaFin', () => {
      expect(franjaOrdenada({ horaInicio: '08:00', horaFin: '10:00' })).toBe(true);
    });

    it('retorna false si horaInicio == horaFin', () => {
      expect(franjaOrdenada({ horaInicio: '08:00', horaFin: '08:00' })).toBe(false);
    });

    it('retorna false si horaInicio > horaFin', () => {
      expect(franjaOrdenada({ horaInicio: '12:00', horaFin: '10:00' })).toBe(false);
    });

    it('retorna true si falta horaInicio o horaFin', () => {
      expect(franjaOrdenada({ horaInicio: '08:00' })).toBe(true);
      expect(franjaOrdenada({ horaFin: '10:00' })).toBe(true);
      expect(franjaOrdenada({})).toBe(true);
    });
  });

  describe('MapaOcupacionQuerySchema', () => {
    it('parsea correctamente con pabellon, piso y franja valida', () => {
      const entrada = {
        pabellon: 'A',
        piso: '2',
        dia: 'MARTES',
        horaInicio: '10:00',
        horaFin: '12:00',
      };
      const resultado = MapaOcupacionQuerySchema.safeParse(entrada);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.piso).toBe(2);
        expect(resultado.data.dia).toBe(DiaSemana.MARTES);
      }
    });

    it('rechaza cuando la franja esta desordenada', () => {
      const entrada = {
        pabellon: 'A',
        piso: 1,
        dia: 'LUNES',
        horaInicio: '14:00',
        horaFin: '12:00',
      };
      const resultado = MapaOcupacionQuerySchema.safeParse(entrada);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe(MENSAJE_FRANJA_DESORDENADA);
      }
    });

    it('rechaza cuando la franja esta incompleta', () => {
      const entrada = {
        pabellon: 'A',
        piso: 1,
        dia: 'LUNES',
      };
      const resultado = MapaOcupacionQuerySchema.safeParse(entrada);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe(MENSAJE_FRANJA_INCOMPLETA);
      }
    });
  });

  describe('filtrosDeMapa', () => {
    it('construye filtros con franja cuando estan presentes todos los campos', () => {
      const parsed = MapaOcupacionQuerySchema.parse({
        pabellon: 'B',
        piso: 3,
        dia: 'MIERCOLES',
        horaInicio: '08:00',
        horaFin: '10:00',
      });
      const filtros = filtrosDeMapa(parsed);
      expect(filtros).toEqual({
        pabellon: 'B',
        piso: 3,
        franja: {
          diaSemana: DiaSemana.MIERCOLES,
          horaInicio: '08:00',
          horaFin: '10:00',
        },
      });
    });

    it('construye filtros sin franja cuando no se especifican dia y horas', () => {
      const parsed = MapaOcupacionQuerySchema.parse({
        pabellon: 'B',
        piso: 3,
      });
      const filtros = filtrosDeMapa(parsed);
      expect(filtros).toEqual({
        pabellon: 'B',
        piso: 3,
        franja: undefined,
      });
    });
  });
});
