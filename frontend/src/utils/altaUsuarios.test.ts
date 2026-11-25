import { describe, expect, it } from 'vitest';
import {
  ALUMNO_VACIO,
  DOCENTE_VACIO,
  cuerpoAlumno,
  cuerpoDocente,
  hoyIso,
  validarAlumno,
  validarDocente,
} from './altaUsuarios';

describe('validarAlumno (Issue 4.17)', () => {
  const valido = {
    ...ALUMNO_VACIO,
    codigo: '20200001',
    nombre: 'Ana Pérez',
    correo: 'ana@unmsm.pe',
  };

  it('acepta los tres datos obligatorios y deja opcionales los demás', () => {
    expect(validarAlumno(valido)).toEqual({});
  });

  it('pide código, nombre y correo', () => {
    expect(Object.keys(validarAlumno(ALUMNO_VACIO)).sort()).toEqual(['codigo', 'correo', 'nombre']);
  });

  it('trata un campo de solo espacios como vacío', () => {
    expect(validarAlumno({ ...valido, nombre: '   ' }).nombre).toMatch(/obligatorio/);
  });

  it('rechaza un correo sin formato y un código de más de 20 caracteres', () => {
    expect(validarAlumno({ ...valido, correo: 'ana@' }).correo).toMatch(/formato/);
    expect(validarAlumno({ ...valido, codigo: '1'.repeat(21) }).codigo).toMatch(/20/);
  });

  it('rechaza una fecha de nacimiento futura y acepta la de hoy', () => {
    const hoy = '2026-11-06';
    expect(
      validarAlumno({ ...valido, fechaNacimiento: '2026-11-07' }, hoy).fechaNacimiento,
    ).toMatch(/futura/);
    expect(validarAlumno({ ...valido, fechaNacimiento: hoy }, hoy)).toEqual({});
  });
});

describe('cuerpoAlumno', () => {
  it('recorta los textos y omite los opcionales vacíos', () => {
    const cuerpo = cuerpoAlumno({
      ...ALUMNO_VACIO,
      codigo: ' 20200001 ',
      nombre: ' Ana Pérez ',
      correo: ' ana@unmsm.pe ',
      dni: '  ',
      telefono: ' 999 ',
    });
    expect(cuerpo).toEqual({
      codigo: '20200001',
      nombre: 'Ana Pérez',
      correo: 'ana@unmsm.pe',
      telefono: '999',
    });
    expect(cuerpo).not.toHaveProperty('dni');
    expect(cuerpo).not.toHaveProperty('fechaNacimiento');
  });
});

describe('docentes (Issue 4.18)', () => {
  const valido = {
    codigoDocente: 'D001',
    nombre: 'Luis Rojas',
    correoInstitucional: 'lrojas@unmsm.pe',
    departamento: 'Ingeniería de Software',
  };

  it('exige los cuatro datos', () => {
    expect(validarDocente(valido)).toEqual({});
    expect(Object.keys(validarDocente(DOCENTE_VACIO)).sort()).toEqual([
      'codigoDocente',
      'correoInstitucional',
      'departamento',
      'nombre',
    ]);
  });

  it('recorta los textos del cuerpo', () => {
    expect(cuerpoDocente({ ...valido, nombre: '  Luis Rojas ' }).nombre).toBe('Luis Rojas');
  });
});

describe('hoyIso', () => {
  it('usa la fecha local, no la UTC', () => {
    expect(hoyIso(new Date(2026, 10, 6, 23, 30))).toBe('2026-11-06');
    expect(hoyIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
