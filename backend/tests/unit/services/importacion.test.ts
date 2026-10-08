const prismaMock: any = {
  seccion: { count: jest.fn(), findFirst: jest.fn() },
  horario: { count: jest.fn() },
  matricula: { count: jest.fn() },
};

jest.mock('../../../src/importers', () => ({
  importarCursosYSecciones: jest.fn(),
  importarHorarios: jest.fn(),
  importarMatriculas: jest.fn(),
  importarDocentes: jest.fn(),
}));

jest.mock('../../../src/services/asignacionDemanda.service', () => ({
  ejecutarAsignacionADemanda: jest.fn(),
}));

import { HttpError } from '../../../src/lib/http';
import {
  extraerFilas,
  MAX_FILAS_IMPORTACION,
  normalizarFilaCsv,
  parsearCsv,
} from '../../../src/lib/archivoImportacion';
import {
  importarCursosYSecciones,
  importarDocentes,
  importarHorarios,
  importarMatriculas,
} from '../../../src/importers';
import { CursoSeccionSchema } from '../../../src/importers/cursosSecciones.importer';
import { DocenteSchema } from '../../../src/importers/docentes.importer';
import { HorarioSchema } from '../../../src/importers/horarios.importer';
import { MatriculaSchema } from '../../../src/importers/matriculas.importer';
import { ejecutarAsignacionADemanda } from '../../../src/services/asignacionDemanda.service';
import {
  dispararAsignacionSiPeriodoCompleto,
  ejecutarImportacion,
} from '../../../src/services/importacion.service';

const resumen = {
  modo: 'periodo',
  periodo: '2026-2',
  corridaId: 'c1',
  totalSecciones: 1,
  asignadas: 1,
  mantenidas: 0,
  escaladas: 0,
  resultados: [],
};

function periodoCon(secciones: number, horarios: number, matriculas: number) {
  prismaMock.seccion.findFirst.mockResolvedValue({ periodo: '2026-2' });
  prismaMock.seccion.count.mockResolvedValue(secciones);
  prismaMock.horario.count.mockResolvedValue(horarios);
  prismaMock.matricula.count.mockResolvedValue(matriculas);
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.PERIODO_VIGENTE;
});

describe('parsearCsv (Issue 1.6)', () => {
  it('lee un CSV con encabezado separado por comas', () => {
    expect(parsearCsv('codigo,nombre\nC1,Cálculo\nC2,Física')).toEqual([
      { codigo: 'C1', nombre: 'Cálculo' },
      { codigo: 'C2', nombre: 'Física' },
    ]);
  });

  it('acepta punto y coma como separador (Excel en español)', () => {
    expect(parsearCsv('codigo;nombre\nC1;Cálculo')).toEqual([{ codigo: 'C1', nombre: 'Cálculo' }]);
  });

  it('ignora el BOM, las líneas vacías y los espacios alrededor de los valores', () => {
    expect(parsearCsv('﻿codigo,nombre\r\n\r\n C1 , Cálculo \r\n')).toEqual([
      { codigo: 'C1', nombre: 'Cálculo' },
    ]);
  });

  it('rechaza con 400 un CSV con filas de distinto largo', () => {
    expect.assertions(2);
    try {
      parsearCsv('a,b,c\n1,2');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(400);
    }
  });
});

describe('normalizarFilaCsv (Issue 1.6)', () => {
  it('cursos-secciones: convierte el stack en lista y el tipo a mayúsculas', () => {
    expect(
      normalizarFilaCsv('cursos-secciones', {
        tipoEspacioRequerido: ' laboratorio ',
        stackSoftwareRequerido: 'MATLAB|Python, Git',
      }),
    ).toEqual({
      tipoEspacioRequerido: 'LABORATORIO',
      stackSoftwareRequerido: ['MATLAB', 'Python', 'Git'],
    });
  });

  it('cursos-secciones: un stack vacío queda como lista vacía', () => {
    expect(normalizarFilaCsv('cursos-secciones', { stackSoftwareRequerido: '' })).toEqual({
      stackSoftwareRequerido: [],
    });
  });

  it('horarios: quita acentos y pasa el día a mayúsculas', () => {
    expect(normalizarFilaCsv('horarios', { diaSemana: 'Miércoles' })).toEqual({
      diaSemana: 'MIERCOLES',
    });
  });

  it.each([
    ['true', true],
    ['1', true],
    ['Sí', true],
    ['si', true],
    ['false', false],
    ['0', false],
    ['no', false],
    ['', false],
  ])('matriculas: movilidadReducida "%s" => %s', (texto, esperado) => {
    expect(normalizarFilaCsv('matriculas', { movilidadReducida: texto })).toEqual({
      movilidadReducida: esperado,
    });
  });

  it('matriculas: crearCuentaAcceso vacío se omite para que aplique el valor por defecto', () => {
    expect(normalizarFilaCsv('matriculas', { crearCuentaAcceso: '' })).toEqual({});
    expect(normalizarFilaCsv('matriculas', { crearCuentaAcceso: 'no' })).toEqual({
      crearCuentaAcceso: false,
    });
  });

  it('docentes: no transforma nada', () => {
    const fila = { codigoDocente: 'D1', nombre: 'Ana' };
    expect(normalizarFilaCsv('docentes', fila)).toEqual(fila);
  });
});

describe('CSV de ejemplo frente a los esquemas reales de los importadores (Issue 1.6)', () => {
  it('cursos-secciones', () => {
    const [fila] = extraerFilas(
      'cursos-secciones',
      'codigoCurso,nombreCurso,codigoSeccion,periodo,tipoEspacioRequerido,stackSoftwareRequerido\n' +
        'INF101,Programación,1,2026-2,laboratorio,Python|Git\n',
    );
    const r = CursoSeccionSchema.safeParse(fila);
    expect(r.success).toBe(true);
    expect(r.data?.stackSoftwareRequerido).toEqual(['Python', 'Git']);
  });

  it('horarios', () => {
    const [fila] = extraerFilas(
      'horarios',
      'codigoCurso,codigoSeccion,periodo,diaSemana,horaInicio,horaFin\n' +
        'INF101,1,2026-2,Miércoles,08:00,10:00\n',
    );
    expect(HorarioSchema.safeParse(fila).success).toBe(true);
  });

  it('matriculas', () => {
    const [fila] = extraerFilas(
      'matriculas',
      'codigoAlumno,nombre,correo,movilidadReducida,codigoCurso,codigoSeccion,periodo\n' +
        '22200101,Ana Pérez,ana@unmsm.edu.pe,si,INF101,1,2026-2\n',
    );
    const r = MatriculaSchema.safeParse(fila);
    expect(r.success).toBe(true);
    expect(r.data?.movilidadReducida).toBe(true);
    expect(r.data?.crearCuentaAcceso).toBe(true);
  });

  it('docentes', () => {
    const [fila] = extraerFilas(
      'docentes',
      'codigoDocente;nombre;correoInstitucional;departamento\n' +
        'D001;Luis Gómez;lgomez@unmsm.edu.pe;Sistemas\n',
    );
    expect(DocenteSchema.safeParse(fila).success).toBe(true);
  });
});

describe('extraerFilas (Issue 1.6)', () => {
  it('acepta un arreglo JSON sin transformarlo', () => {
    const filas = [{ codigoDocente: 'D1' }];
    expect(extraerFilas('docentes', filas)).toBe(filas);
  });

  it('acepta un objeto con la propiedad datos', () => {
    expect(extraerFilas('docentes', { datos: [{ codigoDocente: 'D1' }] })).toEqual([
      { codigoDocente: 'D1' },
    ]);
  });

  it('acepta un CSV como texto y lo normaliza', () => {
    expect(extraerFilas('horarios', 'codigoCurso,diaSemana\nC1,Lunes')).toEqual([
      { codigoCurso: 'C1', diaSemana: 'LUNES' },
    ]);
  });

  it.each([[undefined], [null], [42], [{ otra: [] }]])(
    'rechaza con 400 un cuerpo sin filas reconocibles (%p)',
    (cuerpo) => {
      expect(() => extraerFilas('docentes', cuerpo)).toThrow(HttpError);
    },
  );

  it('rechaza con 400 un archivo vacío', () => {
    expect(() => extraerFilas('docentes', [])).toThrow('no contiene filas');
    expect(() => extraerFilas('docentes', 'a,b\n')).toThrow('no contiene filas');
  });

  it('rechaza con 413 un archivo con más filas que el máximo', () => {
    expect.assertions(1);
    try {
      extraerFilas('docentes', new Array(MAX_FILAS_IMPORTACION + 1).fill({}));
    } catch (error) {
      expect((error as HttpError).status).toBe(413);
    }
  });
});

describe('dispararAsignacionSiPeriodoCompleto (Issue 1.6)', () => {
  it('no dispara si no hay periodo vigente', async () => {
    prismaMock.seccion.findFirst.mockResolvedValue(null);

    const r = await dispararAsignacionSiPeriodoCompleto(prismaMock);

    expect(r).toEqual({ disparada: false, motivo: expect.any(String), resumen: null });
    expect(ejecutarAsignacionADemanda).not.toHaveBeenCalled();
  });

  it.each([
    [0, 5, 5, 'secciones'],
    [3, 0, 5, 'horarios'],
    [3, 5, 0, 'matrículas'],
    [0, 0, 0, 'secciones, horarios, matrículas'],
  ])(
    'no dispara si faltan datos del periodo (%i secciones, %i horarios, %i matrículas)',
    async (secciones, horarios, matriculas, faltantes) => {
      periodoCon(secciones, horarios, matriculas);

      const r = await dispararAsignacionSiPeriodoCompleto(prismaMock);

      expect(r.disparada).toBe(false);
      expect(r.motivo).toContain(faltantes);
      expect(ejecutarAsignacionADemanda).not.toHaveBeenCalled();
    },
  );

  it('dispara la corrida del periodo cuando están los tres tipos de datos', async () => {
    periodoCon(3, 5, 40);
    (ejecutarAsignacionADemanda as jest.Mock).mockResolvedValue(resumen);

    const r = await dispararAsignacionSiPeriodoCompleto(prismaMock);

    expect(r).toEqual({ disparada: true, motivo: null, resumen });
    expect(ejecutarAsignacionADemanda).toHaveBeenCalledWith(undefined, prismaMock);
  });

  it('informa que no se disparó si ya hay una corrida en curso (409)', async () => {
    periodoCon(3, 5, 40);
    (ejecutarAsignacionADemanda as jest.Mock).mockRejectedValue(
      new HttpError(409, 'Ya hay una corrida de asignación en curso.'),
    );

    const r = await dispararAsignacionSiPeriodoCompleto(prismaMock);

    expect(r).toEqual({
      disparada: false,
      motivo: 'Ya hay una corrida de asignación en curso.',
      resumen: null,
    });
  });

  it('no oculta la importación si el motor falla por un error inesperado', async () => {
    periodoCon(3, 5, 40);
    const consola = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (ejecutarAsignacionADemanda as jest.Mock).mockRejectedValue(new Error('detalle interno'));

    const r = await dispararAsignacionSiPeriodoCompleto(prismaMock);

    expect(r.disparada).toBe(false);
    expect(r.motivo).toContain('/api/v1/asignaciones/batch');
    expect(JSON.stringify(r)).not.toContain('detalle interno');
    consola.mockRestore();
  });
});

describe('ejecutarImportacion (Issue 1.6)', () => {
  it('cursos-secciones: devuelve contadores y errores del importador y encadena la asignación', async () => {
    (importarCursosYSecciones as jest.Mock).mockResolvedValue({
      cursosProcesados: 2,
      seccionesProcesadas: 3,
      errores: [],
    });
    periodoCon(3, 5, 40);
    (ejecutarAsignacionADemanda as jest.Mock).mockResolvedValue(resumen);

    const r = await ejecutarImportacion('cursos-secciones', [{}, {}, {}], prismaMock);

    expect(r).toMatchObject({
      tipo: 'cursos-secciones',
      filasRecibidas: 3,
      procesados: { cursosProcesados: 2, seccionesProcesadas: 3 },
      errores: [],
      exitosa: true,
      asignacion: { disparada: true },
    });
  });

  it.each([
    ['horarios', importarHorarios, { horariosProcesados: 1 }],
    ['matriculas', importarMatriculas, { alumnosProcesados: 1, cuentasCreadas: 1 }],
  ] as const)(
    '%s: encadena la asignación cuando no hay filas rechazadas',
    async (tipo, importador, contadores) => {
      (importador as jest.Mock).mockResolvedValue({ ...contadores, errores: [] });
      periodoCon(3, 5, 40);
      (ejecutarAsignacionADemanda as jest.Mock).mockResolvedValue(resumen);

      const r = await ejecutarImportacion(tipo, [{}], prismaMock);

      expect(r.procesados).toEqual(contadores);
      expect(r.asignacion?.disparada).toBe(true);
    },
  );

  it('no dispara la asignación si alguna fila fue rechazada', async () => {
    (importarHorarios as jest.Mock).mockResolvedValue({
      horariosProcesados: 1,
      errores: ['Fila 2: hora inválida'],
    });

    const r = await ejecutarImportacion('horarios', [{}, {}], prismaMock);

    expect(r).toMatchObject({
      exitosa: false,
      errores: ['Fila 2: hora inválida'],
      asignacion: null,
    });
    expect(ejecutarAsignacionADemanda).not.toHaveBeenCalled();
  });

  it('docentes: no encadena la asignación', async () => {
    (importarDocentes as jest.Mock).mockResolvedValue({
      docentesProcesados: 1,
      cuentasCreadas: 1,
      errores: [],
    });

    const r = await ejecutarImportacion('docentes', [{}], prismaMock);

    expect(r).toMatchObject({ exitosa: true, asignacion: null });
    expect(prismaMock.seccion.count).not.toHaveBeenCalled();
    expect(ejecutarAsignacionADemanda).not.toHaveBeenCalled();
  });
});
