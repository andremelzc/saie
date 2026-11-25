import { RolCuenta } from '@prisma/client';
import { restablecerClaveSistema } from '../../../prisma/restablecer-sistema';

describe('Procedimiento de restablecimiento para cuentas de sistema (Issue 4.61 / R20)', () => {
  it('restablece la clave de una cuenta de COORDINACION_ACADEMICA', async () => {
    const dbMock = {
      cuenta: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c-coord',
          usuarioLogin: 'admin',
          rol: RolCuenta.COORDINACION_ACADEMICA,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;

    const res = await restablecerClaveSistema('admin', dbMock);

    expect(res.usuarioLogin).toBe('admin');
    expect(res.rol).toBe(RolCuenta.COORDINACION_ACADEMICA);
    expect(res.claveInicial).toHaveLength(10);
    expect(dbMock.cuenta.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c-coord' },
        data: expect.objectContaining({
          debeCambiarClave: true,
        }),
      }),
    );
  });

  it('restablece la clave de una cuenta de JEFATURA_LABORATORIOS', async () => {
    const dbMock = {
      cuenta: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c-jef',
          usuarioLogin: 'jeflab',
          rol: RolCuenta.JEFATURA_LABORATORIOS,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;

    const res = await restablecerClaveSistema('jeflab', dbMock);

    expect(res.usuarioLogin).toBe('jeflab');
    expect(res.rol).toBe(RolCuenta.JEFATURA_LABORATORIOS);
    expect(res.claveInicial).toBeDefined();
    expect(dbMock.cuenta.update).toHaveBeenCalled();
  });

  it('lanza error si el usuario no existe', async () => {
    const dbMock = {
      cuenta: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    } as any;

    await expect(restablecerClaveSistema('fantasma', dbMock)).rejects.toThrow(
      "No existe ninguna cuenta con el usuario login 'fantasma'",
    );
  });

  it('rechaza si la cuenta no es de sistema (ej. un alumno)', async () => {
    const dbMock = {
      cuenta: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c-alu',
          usuarioLogin: '20231234',
          rol: RolCuenta.ALUMNO,
        }),
        update: jest.fn(),
      },
    } as any;

    await expect(restablecerClaveSistema('20231234', dbMock)).rejects.toThrow(
      'Este procedimiento solo aplica a cuentas de sistema',
    );
    expect(dbMock.cuenta.update).not.toHaveBeenCalled();
  });
});
