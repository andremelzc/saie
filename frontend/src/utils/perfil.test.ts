import { describe, it, expect } from 'vitest';
import { PERFIL_FIXTURE, PERFIL_VACIO_FIXTURE } from '../test/fixtures/perfil';
import {
  aplicarCambios,
  aValorOpcional,
  cambiosDatosPersonales,
  cambiosFichaMedica,
  esFechaNacimientoValida,
  formatearFecha,
  iniciales,
  validarDatosPersonales,
  validarFichaMedica,
  valoresDatosPersonales,
  valoresFichaMedica,
} from './perfil';

const HOY = new Date('2026-10-14T12:00:00Z');

describe('formatearFecha', () => {
  it('escribe el mes con su nombre', () => {
    expect(formatearFecha('2003-04-12')).toBe('12 de abril de 2003');
    expect(formatearFecha('1999-12-01')).toBe('1 de diciembre de 1999');
  });

  it('devuelve null si no hay fecha o el formato no es válido', () => {
    expect(formatearFecha(null)).toBeNull();
    expect(formatearFecha('')).toBeNull();
    expect(formatearFecha('12/04/2003')).toBeNull();
    expect(formatearFecha('2003-13-01')).toBeNull();
  });
});

describe('iniciales', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(iniciales('Ana Lucía Quispe Ramos')).toBe('AL');
    expect(iniciales('  luis   mendoza ')).toBe('LM');
  });

  it('funciona con una sola palabra y con texto vacío', () => {
    expect(iniciales('Ana')).toBe('A');
    expect(iniciales('   ')).toBe('?');
  });
});

describe('esFechaNacimientoValida', () => {
  it('acepta fechas reales del pasado', () => {
    expect(esFechaNacimientoValida('2003-04-12', HOY)).toBe(true);
    expect(esFechaNacimientoValida('2024-02-29', HOY)).toBe(true);
  });

  it.each(['2003-02-30', '2003-4-1', 'abc', '1899-12-31', '2026-10-15', '2027-01-01'])(
    'rechaza %s',
    (valor) => {
      expect(esFechaNacimientoValida(valor, HOY)).toBe(false);
    },
  );
});

describe('validarDatosPersonales', () => {
  it('no marca errores cuando todo está vacío (los datos son opcionales)', () => {
    expect(validarDatosPersonales({ dni: '', fechaNacimiento: '', telefono: '' }, HOY)).toEqual({});
  });

  it('acepta datos correctos', () => {
    expect(
      validarDatosPersonales(
        {
          dni: '72345678',
          fechaNacimiento: '2003-04-12',
          telefono: '+51987654321',
          direccion: 'Lima',
        },
        HOY,
      ),
    ).toEqual({});
  });

  it('marca cada campo incorrecto con su mensaje', () => {
    const errores = validarDatosPersonales(
      { dni: '1234', fechaNacimiento: '2030-01-01', telefono: '12-34', direccion: 'x'.repeat(201) },
      HOY,
    );
    expect(Object.keys(errores).sort()).toEqual([
      'direccion',
      'dni',
      'fechaNacimiento',
      'telefono',
    ]);
    expect(errores.dni).toMatch(/8 dígitos/);
  });
});

describe('validarFichaMedica', () => {
  it('acepta una ficha vacía o completa', () => {
    expect(validarFichaMedica({})).toEqual({});
    expect(validarFichaMedica(valoresFichaMedica(PERFIL_FIXTURE.fichaMedica))).toEqual({});
  });

  it('rechaza un tipo de sangre fuera de la lista y textos demasiado largos', () => {
    const errores = validarFichaMedica({
      tipoSangre: 'Z+',
      alergias: 'a'.repeat(501),
      condicionEspecial: 'b'.repeat(501),
      contactoEmergencia: 'c'.repeat(201),
    });
    expect(Object.keys(errores).sort()).toEqual([
      'alergias',
      'condicionEspecial',
      'contactoEmergencia',
      'tipoSangre',
    ]);
  });
});

describe('conversión entre perfil y formularios', () => {
  it('convierte null en texto vacío y viceversa', () => {
    expect(valoresDatosPersonales(PERFIL_VACIO_FIXTURE.alumno)).toEqual({
      dni: '',
      fechaNacimiento: '',
      telefono: '',
      direccion: '',
    });
    expect(valoresFichaMedica(null).tipoSangre).toBe('');
    expect(aValorOpcional('   ')).toBeNull();
    expect(aValorOpcional('  Lima ')).toBe('Lima');
    expect(aValorOpcional(undefined)).toBeNull();
  });

  it('arma solo la sección que se editó', () => {
    const datos = cambiosDatosPersonales({ dni: '72345678', telefono: '', direccion: ' Lima ' });
    expect(datos).toEqual({
      datosPersonales: {
        dni: '72345678',
        fechaNacimiento: null,
        telefono: null,
        direccion: 'Lima',
      },
    });
    expect(datos.fichaMedica).toBeUndefined();

    const ficha = cambiosFichaMedica({ tipoSangre: 'A+' });
    expect(ficha.fichaMedica?.tipoSangre).toBe('A+');
    expect(ficha.datosPersonales).toBeUndefined();
  });
});

describe('aplicarCambios', () => {
  it('actualiza los datos personales sin tocar el resto', () => {
    const nuevo = aplicarCambios(PERFIL_FIXTURE, {
      datosPersonales: {
        dni: '11111111',
        fechaNacimiento: null,
        telefono: null,
        direccion: null,
      },
    });
    expect(nuevo.alumno.dni).toBe('11111111');
    expect(nuevo.alumno.nombre).toBe(PERFIL_FIXTURE.alumno.nombre);
    expect(nuevo.fichaMedica).toEqual(PERFIL_FIXTURE.fichaMedica);
  });

  it('crea la ficha médica si no existía', () => {
    const nuevo = aplicarCambios(PERFIL_VACIO_FIXTURE, {
      fichaMedica: {
        tipoSangre: 'B+',
        alergias: null,
        condicionEspecial: null,
        contactoEmergencia: null,
        condicionAccesible: false,
      },
    });
    expect(nuevo.fichaMedica?.tipoSangre).toBe('B+');
  });
});
