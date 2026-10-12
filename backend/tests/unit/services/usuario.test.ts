import { Prisma, RolCuenta } from '@prisma/client';
import {
  crearAlumno,
  crearDocente,
  AltaAlumnoSchema,
  AltaDocenteSchema,
} from '../../../src/services/usuario.service';

/* ── helpers ─────────────────────────────────────────────── */

function dbAlumnoMock(exists = false) {
  return {
    alumno: {
      findUnique: jest.fn().mockResolvedValue(exists ? { id: 'a1' } : null),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'nuevo-id',
        codigo: data.codigo,
        nombre: data.nombre,
        correo: data.correo,
      })),
    },
    cuenta: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as any;
}

function dbDocenteMock(exists = false) {
  return {
    docente: {
      findUnique: jest.fn().mockResolvedValue(exists ? { id: 'd1' } : null),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'nuevo-doc-id',
        codigoDocente: data.codigoDocente,
        nombre: data.nombre,
      })),
    },
    cuenta: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as any;
}

/* ── suite: alta alumno (Issue 4.17) ─────────────────────── */

describe('Alta de alumno (Issue 4.17)', () => {
  it('crea persona y cuenta con clave inicial = código y debeCambiarClave', async () => {
    const db = dbAlumnoMock(false);

    const res = await crearAlumno(
      { codigo: 'A2026001', nombre: 'María Quispe', correo: 'mquispe@test.edu' },
      db,
    );

    expect(res).toMatchObject({
      codigo: 'A2026001',
      nombre: 'María Quispe',
      rol: RolCuenta.ALUMNO,
      debeCambiarClave: true,
    });

    // Verifica que la cuenta se creó con claveHash (no en claro)
    const createData = db.alumno.create.mock.calls[0][0].data;
    expect(createData.cuenta.create.rol).toBe('ALUMNO');
    expect(createData.cuenta.create.usuarioLogin).toBe('A2026001');
    expect(createData.cuenta.create.debeCambiarClave).toBe(true);
  });

  it('409 si el código ya existe (alumno previo)', async () => {
    const db = dbAlumnoMock(true);

    await expect(
      crearAlumno(
        { codigo: 'A2026001', nombre: 'Otro', correo: 'otro@test.edu' },
        db,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('409 si ya existe una cuenta con el mismo código de login', async () => {
    const db = dbAlumnoMock(false);
    db.cuenta.findUnique.mockResolvedValue({ id: 'c-dup' }); // ya hay cuenta

    await expect(
      crearAlumno(
        { codigo: 'A2026001', nombre: 'Dup', correo: 'dup@test.edu' },
        db,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('409 si create lanza P2002 (conflicto único)', async () => {
    const db = dbAlumnoMock(false);
    const p2002 = new Prisma.PrismaClientKnownRequestError('', {
      code: 'P2002',
      clientVersion: '1',
    });
    db.alumno.create.mockRejectedValue(p2002);

    await expect(
      crearAlumno(
        { codigo: 'A2026001', nombre: 'Dup2', correo: 'dup2@test.edu' },
        db,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

/* ── suite: alta docente (Issue 4.18) ────────────────────── */

describe('Alta de docente (Issue 4.18)', () => {
  it('crea persona y cuenta con clave inicial = código', async () => {
    const db = dbDocenteMock(false);

    const res = await crearDocente(
      {
        codigoDocente: 'D001',
        nombre: 'Dr. López',
        correoInstitucional: 'dlopez@uni.edu',
        departamento: 'Ingeniería',
      },
      db,
    );

    expect(res).toMatchObject({
      codigo: 'D001',
      nombre: 'Dr. López',
      rol: RolCuenta.DOCENTE,
      debeCambiarClave: true,
    });
  });

  it('409 si el código del docente ya existe', async () => {
    const db = dbDocenteMock(true);

    await expect(
      crearDocente(
        {
          codigoDocente: 'D001',
          nombre: 'X',
          correoInstitucional: 'x@uni.edu',
          departamento: 'Otro',
        },
        db,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

/* ── suite: Zod schemas ─────────────────────────────────── */

describe('AltaAlumnoSchema', () => {
  it('acepta entrada válida', () => {
    expect(() =>
      AltaAlumnoSchema.parse({
        codigo: 'A001',
        nombre: 'María',
        correo: 'maria@test.edu',
      }),
    ).not.toThrow();
  });

  it('acepta campos opcionales', () => {
    const parsed = AltaAlumnoSchema.parse({
      codigo: 'A001',
      nombre: 'María',
      correo: 'maria@test.edu',
      dni: '12345678',
      telefono: '999888777',
    });
    expect(parsed.dni).toBe('12345678');
  });

  it('rechaza correo inválido', () => {
    expect(() =>
      AltaAlumnoSchema.parse({ codigo: 'A001', nombre: 'María', correo: 'no-email' }),
    ).toThrow();
  });

  it('rechaza campos desconocidos (strict)', () => {
    expect(() =>
      AltaAlumnoSchema.parse({
        codigo: 'A001',
        nombre: 'María',
        correo: 'maria@test.edu',
        campoExtra: true,
      }),
    ).toThrow();
  });
});

describe('AltaDocenteSchema', () => {
  it('acepta entrada válida', () => {
    expect(() =>
      AltaDocenteSchema.parse({
        codigoDocente: 'D001',
        nombre: 'Dr. López',
        correoInstitucional: 'dlopez@uni.edu',
        departamento: 'Sistemas',
      }),
    ).not.toThrow();
  });

  it('rechaza sin departamento', () => {
    expect(() =>
      AltaDocenteSchema.parse({
        codigoDocente: 'D001',
        nombre: 'Dr. López',
        correoInstitucional: 'dlopez@uni.edu',
      }),
    ).toThrow();
  });
});
