import { Prisma } from '@prisma/client';
import {
  CrearIncidenciaSchema,
  explorarEspacios,
  generarIdentificadorSeguimiento,
  obtenerHorarioDocente,
  registrarIncidencia,
} from '../../../src/services/docente.service';

const lima = (iso: string) => new Date(`${iso}-05:00`);

function espacio(
  id: string,
  tipo: string,
  pabellon: string,
  piso: number,
  aforo: number,
  pcs: number | null = null,
) {
  return {
    id,
    identificador: `E-${id}`,
    tipo,
    pabellon,
    piso,
    aforoNominal: aforo,
    pcsMalogradas: pcs,
  };
}

describe('Horario y asignaciones activas del docente (Issue 7.2)', () => {
  function seccionDocente(codigo: string, estado: 'VIGENTE' | 'ESCALADA' | null, alumnos: number) {
    return {
      id: `sec-${codigo}`,
      codigoSeccion: '1',
      periodo: '2026-1',
      curso: { codigo, nombre: `Curso ${codigo}` },
      docente: { nombre: 'Dra. Rojas' },
      horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
      asignaciones: estado
        ? [
            {
              id: `asig-${codigo}`,
              estado,
              espacios: [
                {
                  espacio: {
                    id: 'e1',
                    identificador: 'Lab 01',
                    tipo: 'LABORATORIO',
                    pabellon: 'A',
                    piso: 1,
                  },
                },
              ],
            },
          ]
        : [],
      _count: { matriculas: alumnos },
    };
  }

  function prismaMock(secciones: any[], docente: any = { id: 'doc-1' }) {
    return {
      docente: { findUnique: jest.fn().mockResolvedValue(docente) },
      seccion: {
        findFirst: jest.fn().mockResolvedValue({ periodo: '2026-1' }),
        findMany: jest.fn().mockResolvedValue(secciones),
      },
    } as any;
  }

  it('devuelve las sesiones por día y las asignaciones activas con número de alumnos', async () => {
    const prisma = prismaMock([
      seccionDocente('C1', 'VIGENTE', 32),
      seccionDocente('C2', 'ESCALADA', 20),
      seccionDocente('C3', null, 10),
    ]);

    const res = await obtenerHorarioDocente('cuenta-d', undefined, prisma);

    expect(res.dias.LUNES).toHaveLength(3);
    // Solo la VIGENTE es una asignación activa.
    expect(res.asignacionesActivas).toHaveLength(1);
    expect(res.asignacionesActivas[0]).toMatchObject({
      asignacionId: 'asig-C1',
      codigoCurso: 'C1',
      codigoSeccion: '1',
      numeroAlumnos: 32,
      espacios: [expect.objectContaining({ identificador: 'Lab 01' })],
      horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
    });
  });

  it('solo consulta las secciones del docente del token en el periodo vigente', async () => {
    const prisma = prismaMock([]);
    await obtenerHorarioDocente('cuenta-d', undefined, prisma);
    expect(prisma.docente.findUnique).toHaveBeenCalledWith({ where: { cuentaId: 'cuenta-d' } });
    expect(prisma.seccion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { docenteId: 'doc-1', periodo: '2026-1' } }),
    );
  });

  it('soporta la vista por día', async () => {
    const res = await obtenerHorarioDocente(
      'cuenta-d',
      'MARTES',
      prismaMock([seccionDocente('C1', 'VIGENTE', 1)]),
    );
    expect(res.vista).toBe('dia');
    expect(res.dias.MARTES).toEqual([]);
  });

  it('404 si la cuenta no tiene docente asociado', async () => {
    await expect(obtenerHorarioDocente('x', undefined, prismaMock([], null))).rejects.toMatchObject(
      {
        status: 404,
      },
    );
  });
});

describe('Explorar disponibilidad de espacios (Issue 7.3)', () => {
  const espacios = [
    espacio('a1', 'AULA_TEORICA', 'A', 1, 40),
    espacio('a2', 'AULA_TEORICA', 'A', 2, 30),
    espacio('l1', 'LABORATORIO', 'B', 1, 30, 10),
  ];

  // a1 ocupada los lunes de 08:00 a 10:00 por una asignación vigente.
  const vigentes = [
    {
      id: 'x',
      estado: 'VIGENTE',
      espacios: [{ espacioId: 'a1' }],
      seccion: { horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }] },
    },
  ];

  function prismaMock(lista = espacios) {
    return {
      espacio: { findMany: jest.fn().mockResolvedValue(lista) },
      asignacion: { findMany: jest.fn().mockResolvedValue(vigentes) },
    } as any;
  }

  const franja = { diaSemana: 'LUNES' as const, horaInicio: '09:00', horaFin: '09:30' };

  it('marca ocupado el espacio con asignación vigente en la franja y libre el resto', async () => {
    const res = await explorarEspacios({ franja }, prismaMock());
    const porId = Object.fromEntries(res.espacios.map((e) => [e.id, e.disponible]));
    expect(porId).toEqual({ a1: false, a2: true, l1: true });
    expect(res.franja).toEqual(franja);
  });

  it('fuera del horario de la clase el espacio vuelve a estar disponible', async () => {
    const res = await explorarEspacios(
      { franja: { diaSemana: 'LUNES', horaInicio: '10:00', horaFin: '11:00' } },
      prismaMock(),
    );
    expect(res.espacios.find((e) => e.id === 'a1')?.disponible).toBe(true);
  });

  it('delega los filtros de tipo, pabellón y piso a la consulta', async () => {
    const prisma = prismaMock();
    await explorarEspacios({ tipo: 'LABORATORIO', pabellon: 'b', piso: 1, franja }, prisma);
    expect(prisma.espacio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tipo: 'LABORATORIO', pabellon: { equals: 'b', mode: 'insensitive' }, piso: 1 },
      }),
    );
  });

  it('solo considera asignaciones VIGENTES para calcular la ocupación', async () => {
    const prisma = prismaMock();
    await explorarEspacios({ franja }, prisma);
    expect(prisma.asignacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: 'VIGENTE' } }),
    );
  });

  it('filtra por capacidad real mínima (laboratorio descuenta PCs malogradas)', async () => {
    const res = await explorarEspacios({ capacidadMinima: 25, franja }, prismaMock());
    // l1: 30 - 10 = 20 < 25 queda fuera
    expect(res.espacios.map((e) => e.id).sort()).toEqual(['a1', 'a2']);
    expect(res.espacios.find((e) => e.id === 'a1')?.capacidadReal).toBe(40);
  });

  it('soloDisponibles oculta los ocupados', async () => {
    const res = await explorarEspacios({ soloDisponibles: true, franja }, prismaMock());
    expect(res.espacios.map((e) => e.id).sort()).toEqual(['a2', 'l1']);
  });

  it('sin franja usa el momento actual en hora de Lima', async () => {
    // Lunes 2026-03-02 09:15 en Lima
    const res = await explorarEspacios({}, prismaMock(), lima('2026-03-02T09:15:00'));
    expect(res.franja).toEqual({ diaSemana: 'LUNES', horaInicio: '09:15', horaFin: '09:16' });
    expect(res.espacios.find((e) => e.id === 'a1')?.disponible).toBe(false);
  });
});

describe('Registrar incidencia (Issue 7.5)', () => {
  const entrada = CrearIncidenciaSchema.parse({
    asignacionId: 'asig-1',
    espacioId: 'e1',
    tipo: 'EQUIPO_NO_OPERATIVO',
    descripcion: 'Tres PCs no encienden',
  });

  function prismaMock(opciones: { asignacion?: any; docente?: any; create?: jest.Mock } = {}) {
    return {
      docente: {
        findUnique: jest
          .fn()
          .mockResolvedValue(opciones.docente === undefined ? { id: 'doc-1' } : opciones.docente),
      },
      asignacion: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            opciones.asignacion === undefined
              ? { id: 'asig-1', espacios: [{ espacioId: 'e1' }, { espacioId: 'e2' }] }
              : opciones.asignacion,
          ),
      },
      incidencia: {
        create:
          opciones.create ??
          jest.fn().mockImplementation(async ({ data }) => ({
            ...data,
            fechaReporte: new Date('2026-03-02T10:00:00Z'),
          })),
      },
    } as any;
  }

  describe('validación', () => {
    it('aplica prioridad MEDIA por defecto', () => {
      expect(entrada.prioridad).toBe('MEDIA');
    });

    it.each([
      ['tipo inválido', { tipo: 'ROBO' }],
      ['prioridad inválida', { prioridad: 'URGENTE' }],
      ['descripción muy corta', { descripcion: 'x' }],
      ['sin asignación', { asignacionId: '' }],
      ['campo desconocido', { docenteId: 'otro-docente' }],
    ])('rechaza %s', (_n, cambio) => {
      const base = {
        asignacionId: 'a',
        espacioId: 'e',
        tipo: 'OTRO',
        descripcion: 'Descripción válida',
      };
      expect(CrearIncidenciaSchema.safeParse({ ...base, ...cambio }).success).toBe(false);
    });
  });

  it('genera un identificador de seguimiento con formato INC-XXXXXXXX (cabe en 20 caracteres)', () => {
    const id = generarIdentificadorSeguimiento();
    expect(id).toMatch(/^INC-[0-9A-F]{8}$/);
    expect(id.length).toBeLessThanOrEqual(20);
    expect(generarIdentificadorSeguimiento()).not.toBe(id);
  });

  it('persiste la incidencia para el docente del token y devuelve el identificador', async () => {
    const prisma = prismaMock();

    const res = await registrarIncidencia('cuenta-d', entrada, prisma);

    expect(res.identificadorSeguimiento).toMatch(/^INC-[0-9A-F]{8}$/);
    expect(res.estado).toBe('PENDIENTE');
    expect(res.mensaje).toBeTruthy();
    expect(prisma.incidencia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        docenteId: 'doc-1',
        asignacionId: 'asig-1',
        espacioId: 'e1',
        tipo: 'EQUIPO_NO_OPERATIVO',
        prioridad: 'MEDIA',
        identificadorSeguimiento: res.identificadorSeguimiento,
      }),
    });
  });

  it('solo acepta asignaciones vigentes de una sección del propio docente', async () => {
    const prisma = prismaMock();
    await registrarIncidencia('cuenta-d', entrada, prisma);
    expect(prisma.asignacion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'asig-1', estado: 'VIGENTE', seccion: { docenteId: 'doc-1' } },
      }),
    );
  });

  it('404 si la asignación no existe, no está vigente o es de otro docente', async () => {
    const prisma = prismaMock({ asignacion: null });
    await expect(registrarIncidencia('cuenta-d', entrada, prisma)).rejects.toMatchObject({
      status: 404,
    });
    expect(prisma.incidencia.create).not.toHaveBeenCalled();
  });

  it('400 si el espacio no pertenece al bloque asignado', async () => {
    const prisma = prismaMock({ asignacion: { id: 'asig-1', espacios: [{ espacioId: 'otro' }] } });
    await expect(registrarIncidencia('cuenta-d', entrada, prisma)).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.incidencia.create).not.toHaveBeenCalled();
  });

  it('404 si la cuenta no tiene docente asociado', async () => {
    await expect(
      registrarIncidencia('cuenta-x', entrada, prismaMock({ docente: null })),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('reintenta con otro identificador si hay colisión (P2002)', async () => {
    const colision = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const create = jest
      .fn()
      .mockRejectedValueOnce(colision)
      .mockImplementation(async ({ data }) => ({ ...data, fechaReporte: new Date() }));

    const res = await registrarIncidencia('cuenta-d', entrada, prismaMock({ create }));

    expect(create).toHaveBeenCalledTimes(2);
    expect(res.identificadorSeguimiento).toMatch(/^INC-/);
  });

  it('propaga errores que no son colisión de identificador', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db caída'));
    await expect(registrarIncidencia('cuenta-d', entrada, prismaMock({ create }))).rejects.toThrow(
      'db caída',
    );
    expect(create).toHaveBeenCalledTimes(1);
  });
});
