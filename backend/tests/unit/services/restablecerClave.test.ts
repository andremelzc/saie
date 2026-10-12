import { RolCuenta } from '@prisma/client';
import {
  restablecerClave,
  generarClaveInicial,
  RestablecerClaveSchema,
} from '../../../src/services/restablecerClave.service';
import { HttpError } from '../../../src/lib/http';

/* ── helpers ─────────────────────────────────────────────── */

function dbMock({
  alumno = null as any,
  docente = null as any,
  cuenta = null as any,
  alumnosPorCorreo = [] as any[],
  docentesPorCorreo = [] as any[],
} = {}) {
  return {
    alumno: {
      findUnique: jest.fn().mockResolvedValue(alumno),
      findMany: jest.fn().mockResolvedValue(alumnosPorCorreo),
    },
    docente: {
      findUnique: jest.fn().mockResolvedValue(docente),
      findMany: jest.fn().mockResolvedValue(docentesPorCorreo),
    },
    cuenta: {
      findUnique: jest.fn().mockResolvedValue(cuenta),
      update: jest.fn().mockResolvedValue({}),
    },
  } as any;
}

/* ── suite: generarClaveInicial ──────────────────────────── */

describe('generarClaveInicial', () => {
  it('genera una clave de 10 caracteres sin caracteres ambiguos', () => {
    const clave = generarClaveInicial();
    expect(clave).toHaveLength(10);
    // Caracteres ambiguos: 0, O, 1, l, I
    expect(clave).not.toMatch(/[0O1lI]/);
  });

  it('genera claves distintas en cada invocación', () => {
    const claves = new Set(Array.from({ length: 50 }, () => generarClaveInicial()));
    expect(claves.size).toBeGreaterThan(40); // Altamente improbable que colisionen
  });
});

/* ── suite: restablecerClave (Issue 4.26) ────────────────── */

describe('Restablecimiento de clave (Issue 4.26)', () => {
  it('restablece la clave de un alumno por código', async () => {
    const db = dbMock({
      alumno: { codigo: 'A001', nombre: 'María', cuentaId: 'c1' },
      cuenta: { id: 'c1', rol: RolCuenta.ALUMNO, usuarioLogin: 'A001', claveHash: 'x' },
    });

    const res = await restablecerClave({ usuario: 'A001' }, db);

    expect(res).toMatchObject({
      codigo: 'A001',
      nombre: 'María',
      rol: RolCuenta.ALUMNO,
      debeCambiarClave: true,
    });
    expect(res.claveInicial).toHaveLength(10);
    expect(db.cuenta.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ debeCambiarClave: true }),
      }),
    );
  });

  it('restablece la clave de un docente por código', async () => {
    const db = dbMock({
      docente: { codigoDocente: 'D001', nombre: 'Dr. López', cuentaId: 'c2' },
      cuenta: { id: 'c2', rol: RolCuenta.DOCENTE, usuarioLogin: 'D001', claveHash: 'x' },
    });

    const res = await restablecerClave({ usuario: 'D001' }, db);

    expect(res.codigo).toBe('D001');
    expect(res.rol).toBe(RolCuenta.DOCENTE);
  });

  it('404 si no existe el usuario', async () => {
    const db = dbMock();

    await expect(
      restablecerClave({ usuario: 'FANTASMA' }, db),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('403 si la cuenta es de Coordinación (cuenta de sistema)', async () => {
    const db = dbMock({
      cuenta: { id: 'sys', rol: RolCuenta.COORDINACION_ACADEMICA, usuarioLogin: 'admin' },
    });

    await expect(
      restablecerClave({ usuario: 'admin' }, db),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('403 si la cuenta es de Jefatura (cuenta de sistema)', async () => {
    const db = dbMock({
      cuenta: { id: 'sys2', rol: RolCuenta.JEFATURA_LABORATORIOS, usuarioLogin: 'jeflab' },
    });

    await expect(
      restablecerClave({ usuario: 'jeflab' }, db),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('422 si el usuario existe pero no tiene cuenta de acceso', async () => {
    const db = dbMock({
      alumno: { codigo: 'A002', nombre: 'Juan', cuentaId: null },
    });

    await expect(
      restablecerClave({ usuario: 'A002' }, db),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('409 si un correo corresponde a más de una persona', async () => {
    const db = dbMock({
      alumnosPorCorreo: [
        { codigo: 'A001', nombre: 'María', cuentaId: 'c1' },
        { codigo: 'A002', nombre: 'Pedro', cuentaId: 'c2' },
      ],
    });

    await expect(
      restablecerClave({ usuario: 'compartido@uni.edu' }, db),
    ).rejects.toMatchObject({ status: 409 });
  });
});

/* ── suite: RestablecerClaveSchema ───────────────────────── */

describe('RestablecerClaveSchema', () => {
  it('acepta un usuario no vacío', () => {
    expect(() => RestablecerClaveSchema.parse({ usuario: 'A001' })).not.toThrow();
  });

  it('rechaza usuario vacío', () => {
    expect(() => RestablecerClaveSchema.parse({ usuario: '' })).toThrow();
  });

  it('rechaza campos desconocidos (strict)', () => {
    expect(() => RestablecerClaveSchema.parse({ usuario: 'A001', extra: true })).toThrow();
  });
});
