import { CategoriaSoftware, ComparacionVersion, EstadoPeriodo, TipoLicencia } from '@prisma/client';
import {
  LABORATORIOS_ESPECIALIZADOS,
  PROGRAMAS_CATALOGO,
  SOFTWARE_POR_CURSO,
} from '../../../src/data/catalogoSoftwareAprobado';
import {
  CatalogoAprobado,
  aplicarCargaCatalogo,
  leerDatosParaCatalogo,
  normalizarPabellon,
  numeroDeLaboratorio,
  planificarCargaCatalogo,
  resumirPlan,
  validarCatalogo,
} from '../../../src/services/catalogoSoftwareAprobado.service';

const lab = (id: string, pabellon: string, identificador: string) => ({
  id,
  pabellon,
  identificador,
});
const seccion = (id: string, codigoCurso: string, codigoSeccion = '1-LAB', periodo = '2026-2') => ({
  id,
  codigoCurso,
  codigoSeccion,
  periodo,
});

/** Los 18 laboratorios de los planos (`assets/planos/`), con el data center del piso 2. */
const LABORATORIOS_REALES = [
  lab('a08', 'Antiguo Pabellón', 'Aula 104 - Laboratorio 08'),
  lab('a11', 'Antiguo Pabellón', 'Aula 110 - Laboratorio 11'),
  lab('a09', 'Antiguo Pabellón', 'Aula 206 - Laboratorio 09'),
  lab('a06', 'Antiguo Pabellón', 'Aula 302 - Laboratorio 06'),
  lab('a05', 'Antiguo Pabellón', 'Aula 303 - Laboratorio 05'),
  lab('a01', 'Antiguo Pabellón', 'Aula 304 - Laboratorio 01'),
  lab('a02', 'Antiguo Pabellón', 'Aula 305 - Laboratorio 02'),
  lab('a03', 'Antiguo Pabellón', 'Aula 306 - Laboratorio 03'),
  lab('a04', 'Antiguo Pabellón', 'Aula 307 - Laboratorio 04'),
  lab('dc', 'Nuevo Pabellón', 'Aula 206 - Data center'),
  lab('n01', 'Nuevo Pabellón', 'Aula 207 - Laboratorio 01'),
  lab('n02', 'Nuevo Pabellón', 'Aula 208 - Laboratorio 02'),
  lab('n03', 'Nuevo Pabellón', 'Aula 209 - Laboratorio 03'),
  lab('n04', 'Nuevo Pabellón', 'Aula 303 - Laboratorio 04'),
  lab('n05', 'Nuevo Pabellón', 'Aula 304 - Laboratorio 05'),
  lab('n06', 'Nuevo Pabellón', 'Aula 305 - Laboratorio 06'),
  lab('n07', 'Nuevo Pabellón', 'Aula 306 - Laboratorio 07'),
  lab('n08', 'Nuevo Pabellón', 'Aula 307 - Laboratorio 08'),
];

const programasDe = (plan: ReturnType<typeof planificarCargaCatalogo>, espacioId: string) =>
  plan.instalaciones.find((i) => i.espacioId === espacioId)?.programas ?? [];

describe('Catálogo de software aprobado (Issue 6.14)', () => {
  it('tiene los 46 programas del Anexo B, sin errores de coherencia', () => {
    expect(PROGRAMAS_CATALOGO).toHaveLength(46);
    expect(validarCatalogo()).toEqual([]);
    expect(PROGRAMAS_CATALOGO.filter((p) => p.grupo === 'BASE')).toHaveLength(12);
  });

  it('pide software a los 48 cursos del Anexo B que lo necesitan (no a Química General ni a Ética)', () => {
    expect(Object.keys(SOFTWARE_POR_CURSO)).toHaveLength(48);
    expect(SOFTWARE_POR_CURSO['202SW0206']).toBeUndefined();
    expect(SOFTWARE_POR_CURSO['202SW0604']).toBeUndefined();
  });

  it('detecta programas repetidos, grupos sin laboratorios y cursos que piden algo inexistente', () => {
    const roto: CatalogoAprobado = {
      programas: [
        {
          nombre: 'Python',
          categoria: CategoriaSoftware.LENGUAJE,
          tipoLicencia: TipoLicencia.LIBRE,
          grupo: 'BASE',
        },
        {
          nombre: 'python ',
          categoria: CategoriaSoftware.LENGUAJE,
          tipoLicencia: TipoLicencia.LIBRE,
          grupo: 'BASE',
        },
        {
          nombre: 'GNS3',
          categoria: CategoriaSoftware.REDES,
          tipoLicencia: TipoLicencia.LIBRE,
          grupo: 'REDES',
        },
      ],
      especializados: {},
      softwarePorCurso: { X: ['Matlab'] },
    };
    expect(validarCatalogo(roto)).toEqual([
      'El programa «python » está repetido en el catálogo.',
      'El grupo REDES de «GNS3» no tiene laboratorios asignados.',
      'El curso X pide «Matlab», que no está en el catálogo.',
    ]);
    expect(() => planificarCargaCatalogo([], [], roto)).toThrow(
      'El catálogo aprobado tiene errores',
    );
  });

  it('cada grupo especializado tiene al menos 3 laboratorios, para las secciones que ocupan un bloque', () => {
    for (const refs of Object.values(LABORATORIOS_ESPECIALIZADOS)) {
      expect(refs.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('normalizarPabellon y numeroDeLaboratorio', () => {
  it('ignora tildes, mayúsculas y espacios', () => {
    expect(normalizarPabellon('  Nuevo  Pabellón ')).toBe('nuevo pabellon');
  });

  it('lee el número del laboratorio en el identificador', () => {
    expect(numeroDeLaboratorio('Aula 207 - Laboratorio 01')).toBe(1);
    expect(numeroDeLaboratorio('laboratorio 11')).toBe(11);
    expect(numeroDeLaboratorio('Aula 206 - Data center')).toBeNull();
  });
});

describe('planificarCargaCatalogo', () => {
  const plan = planificarCargaCatalogo(LABORATORIOS_REALES, [
    seccion('s1', '202SW0707', '1-LAB'),
    seccion('s2', '202SW0805', '2-LAB'),
    seccion('s3', '202SW0206', '1-LAB'),
  ]);
  const enTodos = PROGRAMAS_CATALOGO.filter((p) => p.grupo === 'BASE' || p.grupo === 'GENERAL');

  it('instala la imagen base y el software general en todos los laboratorios', () => {
    expect(plan.instalaciones).toHaveLength(18);
    for (const i of plan.instalaciones) {
      expect(i.programas).toEqual(expect.arrayContaining(enTodos.map((p) => p.nombre)));
    }
    expect(programasDe(plan, 'dc')).toHaveLength(enTodos.length);
    expect(programasDe(plan, 'a08')).toHaveLength(enTodos.length);
  });

  it('pone el software especializado solo en sus laboratorios', () => {
    expect(programasDe(plan, 'n01')).toEqual(
      expect.arrayContaining([
        'Cisco Packet Tracer',
        'Wireshark',
        'Logisim Evolution',
        'MS-MPI / OpenMPI',
      ]),
    );
    expect(programasDe(plan, 'n01')).not.toContain('Anaconda');
    expect(programasDe(plan, 'n05')).toEqual(
      expect.arrayContaining(['Anaconda', 'Power BI Desktop', 'SQL Server Express + SSMS']),
    );
    expect(programasDe(plan, 'a02')).toEqual(expect.arrayContaining(['Logisim Evolution']));
    expect(programasDe(plan, 'a02')).not.toContain('Cisco Packet Tracer');
    expect(programasDe(plan, 'a05')).toEqual(expect.arrayContaining(['MongoDB Community']));
    expect(programasDe(plan, 'a05')).not.toContain('Weka');
  });

  it('asigna los requisitos de cada curso a sus secciones de laboratorio', () => {
    expect(plan.requisitos).toEqual([
      {
        seccionId: 's1',
        seccion: '202SW0707 1-LAB (2026-2)',
        programas: ['Cisco Packet Tracer', 'Wireshark', 'GNS3'],
      },
      {
        seccionId: 's2',
        seccion: '202SW0805 2-LAB (2026-2)',
        programas: ['MS-MPI / OpenMPI', 'Java JDK', 'GCC / G++'],
      },
    ]);
    expect(plan.cursosSinSecciones).toContain('202SW0303');
    expect(plan.cursosSinSecciones).not.toContain('202SW0707');
    expect(plan.laboratoriosNoEncontrados).toEqual([]);
  });

  it('informa los laboratorios especializados que faltan en la base', () => {
    const parcial = planificarCargaCatalogo(
      [
        lab('n01', 'nuevo pabellon', 'Laboratorio 01'),
        lab('x', 'Nuevo Pabellón', 'Sala sin número'),
      ],
      [],
    );
    expect(parcial.laboratoriosNoEncontrados).toContain('Nuevo Pabellón · Laboratorio 02');
    expect(parcial.laboratoriosNoEncontrados).toContain('Antiguo Pabellón · Laboratorio 01');
    expect(parcial.laboratoriosNoEncontrados).not.toContain('Nuevo Pabellón · Laboratorio 01');
    expect(programasDe(parcial, 'n01')).toContain('GNS3');
    expect(programasDe(parcial, 'x')).toHaveLength(enTodos.length);
  });

  it('resume el plan en líneas legibles, con avisos solo cuando hacen falta', () => {
    const lineas = resumirPlan(plan);
    expect(lineas[0]).toBe('Catálogo: 46 programas.');
    expect(lineas).toContain('Laboratorios: 18.');
    expect(lineas).toContain('Secciones de laboratorio con requisitos: 2.');
    expect(lineas.some((l) => l.startsWith('ℹ️ Cursos del catálogo sin secciones'))).toBe(true);
    expect(lineas.some((l) => l.startsWith('⚠️'))).toBe(false);

    const conFaltantes = resumirPlan(planificarCargaCatalogo([], []));
    expect(conFaltantes.some((l) => l.startsWith('⚠️ Laboratorios especializados'))).toBe(true);
  });
});

describe('leerDatosParaCatalogo', () => {
  it('lee los laboratorios y las secciones de laboratorio activas de los periodos abiertos', async () => {
    const prisma = {
      periodo: {
        findMany: jest.fn().mockResolvedValue([{ codigo: '2026-2' }, { codigo: '2027-1' }]),
      },
      espacio: {
        findMany: jest.fn().mockResolvedValue([lab('n01', 'Nuevo Pabellón', 'Laboratorio 01')]),
      },
      seccion: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 's1', codigoSeccion: '1-LAB', periodo: '2026-2', curso: { codigo: '202SW0707' } },
          ]),
      },
    } as any;

    const datos = await leerDatosParaCatalogo(prisma);

    expect(prisma.periodo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: { not: EstadoPeriodo.CERRADO } } }),
    );
    expect(prisma.seccion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ activa: true, periodo: { in: ['2026-2', '2027-1'] } }),
      }),
    );
    expect(datos.secciones).toEqual([seccion('s1', '202SW0707', '1-LAB', '2026-2')]);
    expect(datos.laboratorios).toHaveLength(1);
  });
});

describe('aplicarCargaCatalogo', () => {
  function crearPrisma(previos: { id: string; nombreNormalizado: string }[]) {
    let n = 0;
    const tx = {
      software: {
        findMany: jest.fn().mockResolvedValue(previos),
        create: jest.fn().mockImplementation(() => Promise.resolve({ id: `nuevo-${++n}` })),
      },
      espacioSoftware: {
        createMany: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
      },
      seccionSoftware: {
        createMany: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
      },
    };
    const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) } as any;
    return { prisma, tx };
  }

  const plan = planificarCargaCatalogo(
    [lab('n01', 'Nuevo Pabellón', 'Aula 207 - Laboratorio 01')],
    [seccion('s1', '202SW0707')],
  );

  it('crea los programas que faltan, sin versión, y añade instalaciones y requisitos sin duplicar', async () => {
    const { prisma, tx } = crearPrisma([{ id: 'py', nombreNormalizado: 'python' }]);

    const r = await aplicarCargaCatalogo(prisma, plan);

    expect(r.programasNuevos).toBe(45);
    expect(tx.software.create).toHaveBeenCalledTimes(45);
    expect(tx.software.create).toHaveBeenCalledWith({
      data: {
        nombre: 'Microsoft Office',
        nombreNormalizado: 'microsoft office',
        version: '',
        categoria: CategoriaSoftware.OFIMATICA,
        tipoLicencia: TipoLicencia.COMERCIAL,
        descripcion: 'Word, Excel y PowerPoint',
      },
      select: { id: true },
    });
    expect(tx.software.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nombre: 'Git', descripcion: null }),
      }),
    );

    const instalaciones = tx.espacioSoftware.createMany.mock.calls[0][0];
    expect(instalaciones.skipDuplicates).toBe(true);
    expect(instalaciones.data).toContainEqual({ espacioId: 'n01', softwareId: 'py' });
    expect(r.instalacionesNuevas).toBe(programasDe(plan, 'n01').length);

    const requisitos = tx.seccionSoftware.createMany.mock.calls[0][0];
    expect(requisitos.skipDuplicates).toBe(true);
    expect(requisitos.data).toHaveLength(3);
    expect(requisitos.data[0]).toEqual(
      expect.objectContaining({
        seccionId: 's1',
        comparacionVersion: ComparacionVersion.CUALQUIERA,
      }),
    );
    expect(r.requisitosNuevos).toBe(3);
  });

  it('no crea programas que ya están en el catálogo', async () => {
    const todos = PROGRAMAS_CATALOGO.map((p, i) => ({
      id: `id-${i}`,
      nombreNormalizado: p.nombre.trim().toLowerCase().replace(/\s+/g, ' '),
    }));
    const { prisma, tx } = crearPrisma(todos);

    const r = await aplicarCargaCatalogo(prisma, plan);

    expect(r.programasNuevos).toBe(0);
    expect(tx.software.create).not.toHaveBeenCalled();
  });
});
