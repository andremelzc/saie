import { ClienteTelegram } from '../../../src/telegram/cliente';
import { LimitadorIntentos } from '../../../src/telegram/limitador';
import {
  ActualizacionTelegram,
  MENSAJES,
  procesarActualizacion,
} from '../../../src/telegram/bot.service';
import { desvincularChat, vincularChat } from '../../../src/telegram/vinculacion.service';
import * as authService from '../../../src/services/auth.service';

describe('procesarActualizacion (Issue 3.25)', () => {
  let cliente: jest.Mocked<ClienteTelegram>;
  let limitador: LimitadorIntentos;
  let prisma: any;

  beforeEach(() => {
    cliente = {
      enviarMensaje: jest.fn().mockResolvedValue(undefined),
      borrarMensaje: jest.fn().mockResolvedValue(undefined),
    };
    limitador = new LimitadorIntentos(5, 15 * 60 * 1000, 15 * 60 * 1000);
    prisma = {
      vinculacionTelegram: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      alumno: { findUnique: jest.fn() },
      cuenta: { findUnique: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    jest.clearAllMocks();
  });

  const actualizacion = (texto?: string, type = 'private', id = 12345): ActualizacionTelegram => ({
    update_id: 1,
    message: {
      message_id: 99,
      text: texto,
      chat: { id, type },
    },
  });

  it('ignora actualizaciones sin texto o que no son chats privados', async () => {
    await procesarActualizacion(actualizacion(undefined, 'private'), {
      prisma,
      cliente,
      limitador,
    });
    await procesarActualizacion(actualizacion('22200101 clave123', 'group'), {
      prisma,
      cliente,
      limitador,
    });

    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
    expect(cliente.borrarMensaje).not.toHaveBeenCalled();
  });

  it('responde bienvenida ante /start, /ayuda o /help', async () => {
    await procesarActualizacion(actualizacion('/start'), { prisma, cliente, limitador });
    expect(cliente.enviarMensaje).toHaveBeenCalledWith('12345', MENSAJES.bienvenida);

    await procesarActualizacion(actualizacion('/ayuda'), { prisma, cliente, limitador });
    expect(cliente.enviarMensaje).toHaveBeenCalledWith('12345', MENSAJES.bienvenida);
  });

  it('procesa /baja desactivando la vinculación', async () => {
    prisma.vinculacionTelegram.updateMany.mockResolvedValue({ count: 1 });
    await procesarActualizacion(actualizacion('/baja'), { prisma, cliente, limitador });

    expect(cliente.enviarMensaje).toHaveBeenCalledWith('12345', MENSAJES.baja);
  });

  it('responde sinVinculacion ante /baja si no había una activa', async () => {
    prisma.vinculacionTelegram.updateMany.mockResolvedValue({ count: 0 });
    await procesarActualizacion(actualizacion('/baja'), { prisma, cliente, limitador });

    expect(cliente.enviarMensaje).toHaveBeenCalledWith('12345', MENSAJES.sinVinculacion);
  });

  it('responde noEntendido si el mensaje no es comando ni son 2 palabras', async () => {
    await procesarActualizacion(actualizacion('hola solo una palabra'), {
      prisma,
      cliente,
      limitador,
    });
    expect(cliente.enviarMensaje).toHaveBeenCalledWith('12345', MENSAJES.noEntendido);
    expect(cliente.borrarMensaje).not.toHaveBeenCalled();
  });

  describe('Flujo de credenciales (código y clave)', () => {
    it('borra siempre el mensaje original con la clave inmediatamente', async () => {
      jest.spyOn(authService, 'verificarCredenciales').mockResolvedValue(null);

      await procesarActualizacion(actualizacion('22200101 claveSecreta'), {
        prisma,
        cliente,
        limitador,
      });

      expect(cliente.borrarMensaje).toHaveBeenCalledWith('12345', 99);
    });

    it('informa bloqueo y no valida credenciales si el chat está bloqueado por fuerza bruta', async () => {
      // Registrar 5 fallos para bloquear
      for (let i = 0; i < 5; i++) {
        limitador.registrarFallo('12345');
      }

      await procesarActualizacion(actualizacion('22200101 claveSecreta'), {
        prisma,
        cliente,
        limitador,
      });

      expect(cliente.enviarMensaje).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('Demasiados intentos'),
      );
    });

    it('vincula exitosamente si las credenciales son correctas y responde felicitación', async () => {
      jest.spyOn(authService, 'verificarCredenciales').mockResolvedValue({ id: 'c1' } as any);
      prisma.alumno.findUnique.mockResolvedValue({ id: 'al-1', nombre: 'Juan Pérez' });
      prisma.vinculacionTelegram.findUnique.mockResolvedValue(null);

      await procesarActualizacion(actualizacion('22200101 claveCorrecta'), {
        prisma,
        cliente,
        limitador,
      });

      expect(cliente.enviarMensaje).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('Listo, Juan Pérez'),
      );
    });

    it('responde chatEnUso si el chat ya está vinculado activamente a otro alumno', async () => {
      jest.spyOn(authService, 'verificarCredenciales').mockResolvedValue({ id: 'c1' } as any);
      prisma.alumno.findUnique.mockResolvedValue({ id: 'al-1', nombre: 'Juan' });
      prisma.vinculacionTelegram.findUnique.mockResolvedValue({
        id: 'v-otro',
        alumnoId: 'al-otro',
        activo: true,
      });

      await procesarActualizacion(actualizacion('22200101 claveCorrecta'), {
        prisma,
        cliente,
        limitador,
      });

      expect(cliente.enviarMensaje).toHaveBeenCalledWith('12345', MENSAJES.chatEnUso);
    });

    it('responde credencialesInvalidas si la verificación falla', async () => {
      jest.spyOn(authService, 'verificarCredenciales').mockResolvedValue(null);

      await procesarActualizacion(actualizacion('22200101 claveErronea'), {
        prisma,
        cliente,
        limitador,
      });

      expect(cliente.enviarMensaje).toHaveBeenCalledWith('12345', MENSAJES.credencialesInvalidas);
    });
  });
});

describe('vincularChat y desvincularChat (Issue 3.25)', () => {
  it('libera chat inactivo de otro alumno antes de vincular el nuevo', async () => {
    const prisma = {
      alumno: { findUnique: jest.fn().mockResolvedValue({ id: 'al-nuevo', nombre: 'Carlos' }) },
      vinculacionTelegram: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'v-viejo', alumnoId: 'al-anterior', activo: false }),
        delete: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    } as any;

    jest.spyOn(authService, 'verificarCredenciales').mockResolvedValue({ id: 'c1' } as any);

    const res = await vincularChat('123', '22200102', 'clave', prisma);

    expect(res).toEqual({ resultado: 'VINCULADO', nombre: 'Carlos' });
    expect(prisma.vinculacionTelegram.delete).toHaveBeenCalledWith({ where: { id: 'v-viejo' } });
    expect(prisma.vinculacionTelegram.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { alumnoId: 'al-nuevo' },
      }),
    );
  });

  it('desvincularChat retorna false si no había vinculación activa', async () => {
    const prisma = {
      vinculacionTelegram: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any;

    const res = await desvincularChat('123', prisma);
    expect(res).toBe(false);
  });
});
