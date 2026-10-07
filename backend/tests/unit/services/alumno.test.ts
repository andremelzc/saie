import {
  ActualizarPerfilSchema,
  actualizarPerfilAlumno,
  listarCursosAlumno,
  obtenerHorarioAlumno,
  obtenerPerfilAlumno,
} from '../../../src/services/alumno.service';
import { obtenerAsignacionPorAlumno } from '../../../src/services/consulta.service';

const lima = (iso: string) => new Date(`${iso}-05:00`);

function seccion(
  codigoCurso: string,
  horarios: Array<[string, string, string]>,
  opciones: { asignada?: boolean; docente?: string | null } = {},
) {
  const asignada = opciones.asignada ?? true;
  return {
    id: `sec-${codigoCurso}`,
    codigoSeccion: '1',
    periodo: '2026-1',
    curso: { codigo: codigoCurso, nombre: `Curso ${codigoCurso}` },
    docente: opciones.docente === null ? null : { nombre: opciones.docente ?? 'Dr. Pérez' },
    horarios: horarios.map(([diaSemana, horaInicio, horaFin]) => ({
      diaSemana,
      horaInicio,
      horaFin,
    })),
    asignaciones: asignada
      ? [
          {
            id: `asig-${codigoCurso}`,
            estado: 'VIGENTE',
            espacios: [
              {
                espacio: {
                  id: 'esp-1',
                  identificador: 'Aula 201',
                  tipo: 'AULA_TEORICA',
                  pabellon: 'A',
                  piso: 2,
                },
              },
            ],
          },
        ]
      : [],
  };
}

function prismaMock(secciones: any[] = [], alumno: any = { id: 'alu-1' }) {
  return {
    alumno: {
      findUnique: jest.fn().mockResolvedValue(alumno),
      update: jest.fn(),
    },
    seccion: { findFirst: jest.fn().mockResolvedValue({ periodo: '2026-1' }) },
    matricula: {
      findMany: jest.fn().mockResolvedValue(secciones.map((s) => ({ seccion: s }))),
    },
    fichaMedica: { upsert: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  } as any;
}

describe('Horario semanal del alumno (Issue 3.10)', () => {
  const secciones = [
    seccion('C2', [['MARTES', '10:00', '12:00']]),
    seccion('C1', [
      ['LUNES', '08:00', '10:00'],
      ['MIERCOLES', '08:00', '10:00'],
    ]),
  ];

  it('devuelve las sesiones de la semana con curso, docente, espacio y horario', async () => {
    const res = await obtenerHorarioAlumno('cuenta-1', undefined, prismaMock(secciones));

    expect(res.vista).toBe('semana');
    expect(res.periodo).toBe('2026-1');
    expect(res.dias.LUNES).toHaveLength(1);
    expect(res.dias.LUNES?.[0]).toMatchObject({
      codigoCurso: 'C1',
      nombreCurso: 'Curso C1',
      docenteNombre: 'Dr. Pérez',
      horaInicio: '08:00',
      horaFin: '10:00',
      espacios: [expect.objectContaining({ identificador: 'Aula 201', pabellon: 'A', piso: 2 })],
    });
    expect(res.dias.MARTES?.[0].codigoCurso).toBe('C2');
  });

  it('soporta la vista por día', async () => {
    const res = await obtenerHorarioAlumno('cuenta-1', 'MARTES', prismaMock(secciones));
    expect(res.vista).toBe('dia');
    expect(Object.keys(res.dias)).toEqual(['MARTES']);
  });

  it('busca el alumno por la cuenta del token y filtra por su periodo vigente', async () => {
    const prisma = prismaMock(secciones);
    await obtenerHorarioAlumno('cuenta-1', undefined, prisma);
    expect(prisma.alumno.findUnique).toHaveBeenCalledWith({ where: { cuentaId: 'cuenta-1' } });
    expect(prisma.matricula.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { alumnoId: 'alu-1', seccion: { periodo: '2026-1' } } }),
    );
  });

  it('una sección sin asignar aparece sin espacios y como PENDIENTE', async () => {
    const res = await obtenerHorarioAlumno(
      'cuenta-1',
      undefined,
      prismaMock([seccion('C1', [['LUNES', '08:00', '10:00']], { asignada: false })]),
    );
    expect(res.dias.LUNES?.[0]).toMatchObject({ espacios: [], estadoAsignacion: 'PENDIENTE' });
  });

  it('responde 404 si la cuenta no tiene alumno asociado', async () => {
    await expect(
      obtenerHorarioAlumno('cuenta-x', undefined, prismaMock([], null)),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('Cursos matriculados del alumno (Issue 3.11)', () => {
  const secciones = [
    seccion('C2', [['VIERNES', '10:00', '12:00']], { docente: null }),
    seccion('C1', [
      ['LUNES', '08:00', '10:00'],
      ['MIERCOLES', '14:00', '16:00'],
    ]),
  ];

  it('lista todos los cursos con docente, horario y próximo espacio', async () => {
    // Lunes 11:00 -> la próxima de C1 es el miércoles 14:00
    const res = await listarCursosAlumno(
      'cuenta-1',
      prismaMock(secciones),
      lima('2026-03-02T11:00:00'),
    );

    expect(res.cursos.map((c) => c.codigoCurso)).toEqual(['C1', 'C2']);
    const c1 = res.cursos[0];
    expect(c1.docenteNombre).toBe('Dr. Pérez');
    expect(c1.horarios).toHaveLength(2);
    expect(c1.proximaSesion).toMatchObject({
      diaSemana: 'MIERCOLES',
      horaInicio: '14:00',
      espacios: [expect.objectContaining({ identificador: 'Aula 201' })],
    });
    expect(res.cursos[1].docenteNombre).toBeNull();
  });

  it('sin periodo vigente devuelve lista vacía', async () => {
    const prisma = prismaMock(secciones);
    prisma.seccion.findFirst.mockResolvedValue(null);
    const res = await listarCursosAlumno('cuenta-1', prisma);
    expect(res).toEqual({ periodo: null, cursos: [] });
  });
});

describe('Datos personales y ficha médica (Issue 3.12)', () => {
  const alumnoCompleto = {
    id: 'alu-1',
    codigo: '22200101',
    nombre: 'Ana Quispe',
    correo: 'ana@unmsm.edu.pe',
    dni: '12345678',
    fechaNacimiento: new Date('2003-05-17T00:00:00.000Z'),
    telefono: '987654321',
    direccion: 'Av. Venezuela 123',
    fichaMedica: {
      alumnoId: 'alu-1',
      tipoSangre: 'O+',
      alergias: 'Penicilina',
      condicionEspecial: null,
      contactoEmergencia: '999888777',
    },
  };

  describe('validación (Zod)', () => {
    const valida = (input: unknown) => ActualizarPerfilSchema.safeParse(input).success;

    it('acepta datos válidos', () => {
      expect(
        valida({
          datosPersonales: {
            dni: '12345678',
            telefono: '+51987654321',
            fechaNacimiento: '2003-05-17',
          },
          fichaMedica: { tipoSangre: 'AB-', alergias: 'Ninguna' },
        }),
      ).toBe(true);
    });

    it.each([
      ['DNI con letras', { datosPersonales: { dni: '1234abcd' } }],
      ['DNI de 7 dígitos', { datosPersonales: { dni: '1234567' } }],
      ['teléfono corto', { datosPersonales: { telefono: '12345' } }],
      ['teléfono con letras', { datosPersonales: { telefono: '98765abcd' } }],
      ['fecha con formato inválido', { datosPersonales: { fechaNacimiento: '17/05/2003' } }],
      ['fecha inexistente', { datosPersonales: { fechaNacimiento: '2003-02-31' } }],
      ['fecha futura', { datosPersonales: { fechaNacimiento: '2999-01-01' } }],
      ['fecha anterior a 1900', { datosPersonales: { fechaNacimiento: '1850-01-01' } }],
      ['tipo de sangre inválido', { fichaMedica: { tipoSangre: 'Z+' } }],
      ['campo no editable (nombre)', { datosPersonales: { nombre: 'Otro' } }],
      ['campo desconocido en raíz', { codigo: '999' }],
    ])('rechaza %s', (_nombre, input) => {
      expect(valida(input)).toBe(false);
    });

    it('permite null para borrar un dato opcional', () => {
      expect(valida({ datosPersonales: { telefono: null, direccion: null } })).toBe(true);
    });
  });

  it('GET: devuelve datos personales y ficha del alumno dueño de la cuenta', async () => {
    const prisma = prismaMock();
    prisma.alumno.findUnique.mockResolvedValue(alumnoCompleto);

    const perfil = await obtenerPerfilAlumno('cuenta-1', prisma);

    expect(prisma.alumno.findUnique).toHaveBeenCalledWith({
      where: { cuentaId: 'cuenta-1' },
      include: { fichaMedica: true },
    });
    expect(perfil.alumno).toMatchObject({
      codigo: '22200101',
      dni: '12345678',
      fechaNacimiento: '2003-05-17',
      telefono: '987654321',
    });
    expect(perfil.fichaMedica).toEqual({
      tipoSangre: 'O+',
      alergias: 'Penicilina',
      condicionEspecial: null,
      contactoEmergencia: '999888777',
    });
  });

  it('GET: perfil sin ficha médica devuelve fichaMedica null', async () => {
    const prisma = prismaMock();
    prisma.alumno.findUnique.mockResolvedValue({ ...alumnoCompleto, fichaMedica: null });
    expect((await obtenerPerfilAlumno('c', prisma)).fichaMedica).toBeNull();
  });

  it('GET: 404 si la cuenta no tiene alumno', async () => {
    const prisma = prismaMock();
    prisma.alumno.findUnique.mockResolvedValue(null);
    await expect(obtenerPerfilAlumno('c', prisma)).rejects.toMatchObject({ status: 404 });
  });

  it('PATCH: actualiza solo los campos enviados, sobre el alumno del token', async () => {
    const prisma = prismaMock();
    const tx = {
      alumno: {
        update: jest.fn().mockResolvedValue({ ...alumnoCompleto, telefono: '911222333' }),
      },
      fichaMedica: {
        upsert: jest
          .fn()
          .mockResolvedValue({
            tipoSangre: 'A+',
            alergias: null,
            condicionEspecial: null,
            contactoEmergencia: null,
          }),
        findUnique: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));

    const perfil = await actualizarPerfilAlumno(
      'cuenta-1',
      {
        datosPersonales: { telefono: '911222333', fechaNacimiento: '2003-05-17' },
        fichaMedica: { tipoSangre: 'A+' },
      },
      prisma,
    );

    expect(tx.alumno.update).toHaveBeenCalledWith({
      where: { id: 'alu-1' },
      data: { telefono: '911222333', fechaNacimiento: new Date('2003-05-17T00:00:00.000Z') },
    });
    expect(tx.fichaMedica.upsert).toHaveBeenCalledWith({
      where: { alumnoId: 'alu-1' },
      create: { alumnoId: 'alu-1', tipoSangre: 'A+' },
      update: { tipoSangre: 'A+' },
    });
    expect(perfil.alumno.telefono).toBe('911222333');
    expect(perfil.fichaMedica?.tipoSangre).toBe('A+');
  });

  it('PATCH: la ficha médica se lee/edita siempre por el id del alumno del token', async () => {
    const prisma = prismaMock();
    const tx = {
      alumno: { update: jest.fn() },
      fichaMedica: { upsert: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));

    await actualizarPerfilAlumno('cuenta-1', {}, prisma);

    expect(prisma.alumno.findUnique).toHaveBeenCalledWith({ where: { cuentaId: 'cuenta-1' } });
    expect(tx.fichaMedica.findUnique).toHaveBeenCalledWith({ where: { alumnoId: 'alu-1' } });
    expect(tx.alumno.update).not.toHaveBeenCalled();
  });

  it('la ficha médica nunca sale en la consulta pública por código (Issues 3.1–3.4)', async () => {
    const prisma = {
      alumno: {
        findUnique: jest.fn().mockResolvedValue({
          ...alumnoCompleto,
          matriculas: [],
        }),
      },
    } as any;

    const publico = await obtenerAsignacionPorAlumno('22200101', prisma);
    const serializado = JSON.stringify(publico);

    expect(serializado).not.toContain('Penicilina');
    expect(serializado).not.toContain('tipoSangre');
    expect(serializado).not.toContain('fichaMedica');
    expect(serializado).not.toContain('12345678'); // DNI
    expect(serializado).not.toContain('987654321'); // teléfono
  });
});
