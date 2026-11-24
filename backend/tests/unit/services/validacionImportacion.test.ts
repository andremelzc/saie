import { DiaSemana } from '@prisma/client';
import { validarImportacion } from '../../../src/services/validacionImportacion.service';

const LUNES_8_10 = { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' };

/** Sección tal como la devuelve la consulta agrupada del validador. */
function seccion(
  codigoCurso: string,
  codigoSeccion: string,
  docenteId: string | null,
  horarios = [LUNES_8_10],
) {
  return {
    id: `${codigoCurso}-${codigoSeccion}`,
    codigoSeccion,
    periodo: '2026-2',
    docenteId,
    curso: { codigo: codigoCurso },
    horarios,
  };
}

function crearDb(secciones: ReturnType<typeof seccion>[] = []) {
  return {
    curso: {},
    seccion: { findMany: jest.fn().mockResolvedValue(secciones) },
    software: { findUnique: jest.fn().mockResolvedValue(null) },
  } as any;
}

function horario(codigoCurso: string, codigoSeccion: string, extra: Record<string, string> = {}) {
  return {
    codigoCurso,
    codigoSeccion,
    periodo: '2026-2',
    diaSemana: 'LUNES',
    horaInicio: '08:00',
    horaFin: '10:00',
    ...extra,
  };
}

function matricula(codigoAlumno: string, codigoCurso: string, codigoSeccion: string) {
  return {
    codigoAlumno,
    nombre: 'Alumno',
    correo: 'alumno@unmsm.edu.pe',
    codigoCurso,
    codigoSeccion,
    periodo: '2026-2',
  };
}

describe('Validación previa de importaciones (Issue 1.16, riesgos R34 y R36)', () => {
  describe('horarios', () => {
    it('acepta un archivo correcto sin errores ni advertencias', async () => {
      const db = crearDb([seccion('C1', '1', 'doc-1')]);
      const r = await validarImportacion('horarios', [horario('C1', '1')], db);
      expect(r).toEqual({ errores: [], advertencias: [] });
      expect(db.seccion.findMany).toHaveBeenCalledTimes(1);
    });

    it('reporta en orden todos los problemas del archivo, no solo el primero', async () => {
      const db = crearDb([seccion('C1', '1', null)]);
      const r = await validarImportacion(
        'horarios',
        [
          horario('C1', '1'),
          horario('C1', '1', { horaInicio: '10:00', horaFin: '08:00' }),
          horario('C9', '1'),
          horario('C1', '1'),
          { codigoCurso: '' },
        ],
        db,
      );

      expect(r.errores).toHaveLength(4);
      expect(r.errores[0]).toBe(
        'Fila 2: La hora de inicio (10:00) debe ser menor a la hora de fin (08:00)',
      );
      expect(r.errores[1]).toBe(
        'Fila 3: No existe la sección 1 para el curso C9 en el periodo 2026-2',
      );
      expect(r.errores[2]).toContain('Fila 4: la franja LUNES 08:00 de C1-1 está repetida');
      expect(r.errores[3]).toMatch(/^Fila 5: /);
    });

    it('rechaza un periodo mal escrito', async () => {
      const r = await validarImportacion(
        'horarios',
        [horario('C1', '1', { periodo: '2026-III' })],
        crearDb(),
      );
      expect(r.errores[0]).toContain('El periodo debe tener el formato');
    });

    it('advierte si un docente tendría dos clases a la vez dentro del archivo', async () => {
      const db = crearDb([seccion('C1', '1', 'doc-1'), seccion('C2', '1', 'doc-1')]);
      const r = await validarImportacion(
        'horarios',
        [horario('C1', '1'), horario('C2', '1', { horaInicio: '09:00', horaFin: '11:00' })],
        db,
      );
      expect(r.errores).toEqual([]);
      expect(r.advertencias).toEqual([
        'El docente de C1-1 y C2-1 tendría dos clases a la vez (LUNES 08:00-10:00 y LUNES 09:00-11:00)',
      ]);
    });

    it('advierte el choque con una sección del mismo docente que ya está en la base', async () => {
      const db = crearDb([seccion('C1', '1', 'doc-1', []), seccion('C2', '1', 'doc-1')]);
      const r = await validarImportacion('horarios', [horario('C1', '1')], db);
      expect(r.advertencias).toHaveLength(1);
      expect(r.advertencias[0]).toContain('C1-1 y C2-1');
    });

    it('no advierte si las clases de distintos docentes coinciden', async () => {
      const db = crearDb([seccion('C1', '1', 'doc-1'), seccion('C2', '1', 'doc-2')]);
      const r = await validarImportacion('horarios', [horario('C1', '1'), horario('C2', '1')], db);
      expect(r.advertencias).toEqual([]);
    });
  });

  describe('matrículas', () => {
    it('advierte si un alumno quedaría en dos clases a la vez', async () => {
      const db = crearDb([seccion('C1', '1', null), seccion('C2', '1', null)]);
      const r = await validarImportacion(
        'matriculas',
        [matricula('A1', 'C1', '1'), matricula('A1', 'C2', '1')],
        db,
      );
      expect(r.errores).toEqual([]);
      expect(r.advertencias).toEqual([
        'El alumno A1 tendría dos clases a la vez: C1-1 y C2-1 (LUNES 08:00-10:00)',
      ]);
    });

    it('rechaza matrículas repetidas y secciones que no existen', async () => {
      const db = crearDb([seccion('C1', '1', null)]);
      const r = await validarImportacion(
        'matriculas',
        [matricula('A1', 'C1', '1'), matricula('A1', 'C1', '1'), matricula('A2', 'C9', '1')],
        db,
      );
      expect(r.errores).toEqual([
        'Fila 2: la matrícula de A1 en C1-1 está repetida (ya aparece en la fila 1)',
        'Fila 3: No existe la sección 1 para el curso C9 en el periodo 2026-2',
      ]);
    });

    it('no consulta la base si ninguna fila es válida', async () => {
      const db = crearDb();
      const r = await validarImportacion('matriculas', [{}], db);
      expect(r.errores).toHaveLength(1);
      expect(db.seccion.findMany).not.toHaveBeenCalled();
    });
  });

  describe('cursos y secciones', () => {
    const fila = (software = '') => ({
      codigoCurso: 'C1',
      nombreCurso: 'Curso',
      codigoSeccion: '1-LAB',
      periodo: '2026-2',
      tipoEspacioRequerido: 'LABORATORIO',
      stackSoftwareRequerido: software ? [software] : [],
    });

    it('rechaza el software que no está en el catálogo, una vez por fila', async () => {
      const db = crearDb();
      const r = await validarImportacion(
        'cursos-secciones',
        [fila('Matlab'), { ...fila('Matlab'), codigoSeccion: '2-LAB' }],
        db,
      );
      expect(db.software.findUnique).toHaveBeenCalledTimes(1);
      expect(r.errores).toEqual([
        'Fila 1 (C1-1-LAB): SOFTWARE_NO_REGISTRADO Matlab',
        'Fila 2 (C1-2-LAB): SOFTWARE_NO_REGISTRADO Matlab',
      ]);
    });

    it('rechaza secciones repetidas en el mismo archivo', async () => {
      const r = await validarImportacion('cursos-secciones', [fila(), fila()], crearDb());
      expect(r.errores).toEqual([
        'Fila 2: la sección C1-1-LAB (2026-2) está repetida (ya aparece en la fila 1)',
      ]);
    });
  });

  describe('docentes', () => {
    it('rechaza docentes repetidos', async () => {
      const docente = {
        codigoDocente: 'D1',
        nombre: 'Docente',
        correoInstitucional: 'd1@unmsm.edu.pe',
        departamento: 'Software',
      };
      const r = await validarImportacion('docentes', [docente, docente], crearDb());
      expect(r.errores).toEqual(['Fila 2: el docente D1 está repetida (ya aparece en la fila 1)']);
    });
  });
});
