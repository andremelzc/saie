import bcrypt from 'bcrypt';
import { cambiarClave, CambiarClaveSchema } from '../../../src/services/cuenta.service';

/* ── helpers ─────────────────────────────────────────────── */

async function cuentaMock(clave: string, usuario: string = 'alumno01') {
  return {
    id: 'cuenta1',
    usuarioLogin: usuario,
    claveHash: await bcrypt.hash(clave, 1), // 1 ronda para velocidad en tests
    debeCambiarClave: true,
    rol: 'ALUMNO' as const,
  };
}

function dbMock(cuenta: any | null) {
  return {
    cuenta: {
      findUnique: jest.fn().mockResolvedValue(cuenta),
      update: jest.fn().mockResolvedValue({ debeCambiarClave: false }),
    },
  } as any;
}

/* ── suite: cambiar clave (Issue 4.21) ───────────────────── */

describe('Cambio de contraseña (Issue 4.21)', () => {
  it('cambia correctamente la clave y baja debeCambiarClave', async () => {
    const cuenta = await cuentaMock('OldPass123');
    const db = dbMock(cuenta);

    const res = await cambiarClave(
      'cuenta1',
      {
        claveActual: 'OldPass123',
        claveNueva: 'NewPass456',
      },
      db,
    );

    expect(res).toEqual({ debeCambiarClave: false });
    expect(db.cuenta.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cuenta1' },
        data: expect.objectContaining({ debeCambiarClave: false }),
      }),
    );

    // Verifica que la nueva clave fue hasheada
    const updateCall = db.cuenta.update.mock.calls[0][0].data;
    expect(updateCall.claveHash).toBeDefined();
    expect(updateCall.claveHash).not.toBe('NewPass456'); // no guardada en claro
  });

  it('400 si la clave actual es incorrecta', async () => {
    const cuenta = await cuentaMock('RealPass99');
    const db = dbMock(cuenta);

    await expect(
      cambiarClave('cuenta1', { claveActual: 'WrongPassword', claveNueva: 'NuevaOk12' }, db),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('incorrecta') });
  });

  it('400 si la clave nueva es igual a la actual', async () => {
    const cuenta = await cuentaMock('MismaClave1');
    const db = dbMock(cuenta);

    await expect(
      cambiarClave('cuenta1', { claveActual: 'MismaClave1', claveNueva: 'MismaClave1' }, db),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('distinta') });
  });

  it('400 si la clave nueva es igual al código de acceso (usuarioLogin)', async () => {
    const cuenta = await cuentaMock('ViejaOk123', 'alumno01');
    const db = dbMock(cuenta);

    await expect(
      cambiarClave('cuenta1', { claveActual: 'ViejaOk123', claveNueva: 'alumno01' }, db),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('código de acceso') });
  });

  it('404 si la cuenta no existe', async () => {
    const db = dbMock(null);

    await expect(
      cambiarClave('nope', { claveActual: 'x', claveNueva: '12345678' }, db),
    ).rejects.toMatchObject({ status: 404 });
  });
});

/* ── suite: Zod schema ──────────────────────────────────── */

describe('CambiarClaveSchema', () => {
  it('acepta entrada válida (8+ caracteres)', () => {
    expect(() =>
      CambiarClaveSchema.parse({ claveActual: 'OldOne11', claveNueva: 'NewPass88' }),
    ).not.toThrow();
  });

  it('rechaza clave nueva con menos de 8 caracteres', () => {
    expect(() => CambiarClaveSchema.parse({ claveActual: 'ok', claveNueva: 'short' })).toThrow();
  });

  it('rechaza campos desconocidos (strict)', () => {
    expect(() =>
      CambiarClaveSchema.parse({
        claveActual: 'ok',
        claveNueva: 'LongEnough1',
        extra: true,
      }),
    ).toThrow();
  });
});
