import { EstadoSolicitud } from '@prisma/client';
import { logger } from '../../../src/lib/logger';
import {
  avisarAccesibilidadAlAlumno,
  formatearAvisoAccesibilidad,
} from '../../../src/telegram/avisoAccesibilidad';
import { ClienteTelegram, ErrorTelegram } from '../../../src/telegram/cliente';
import { ColaEnvios } from '../../../src/telegram/cola';

const APROBADA = {
  alumnoId: 'alu-1',
  estado: EstadoSolicitud.APROBADA,
  resultado: '2 de 3 clases quedaron en el piso 1',
};

function crearDeps(vinculacion: { id: string; chatId: string } | null) {
  const cliente: jest.Mocked<ClienteTelegram> = {
    enviarMensaje: jest.fn().mockResolvedValue(undefined),
    borrarMensaje: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = { vinculacionTelegram: { findFirst: jest.fn().mockResolvedValue(vinculacion) } };
  return {
    cliente,
    prisma,
    deps: {
      prisma: prisma as never,
      cliente,
      cola: new ColaEnvios(0),
      esperar: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('formatearAvisoAccesibilidad (Issue 3.60)', () => {
  it('al aprobarla informa el resultado', () => {
    const texto = formatearAvisoAccesibilidad(APROBADA);
    expect(texto).toContain('aprobó tu solicitud de aulas en el piso 1');
    expect(texto).toContain('Resultado: 2 de 3 clases quedaron en el piso 1.');
  });

  it('al aprobarla sin resultado omite esa línea', () => {
    expect(formatearAvisoAccesibilidad({ ...APROBADA, resultado: null })).not.toContain(
      'Resultado',
    );
  });

  it('al rechazarla remite al perfil sin incluir el motivo', () => {
    const texto = formatearAvisoAccesibilidad({
      alumnoId: 'alu-1',
      estado: EstadoSolicitud.RECHAZADA,
      resultado: null,
    });
    expect(texto).toContain('no aprobó');
    expect(texto).toContain('Revisa el motivo en tu perfil');
  });

  it('nunca menciona la condición del alumno (RNF-11)', () => {
    for (const estado of [EstadoSolicitud.APROBADA, EstadoSolicitud.RECHAZADA]) {
      const texto = formatearAvisoAccesibilidad({ ...APROBADA, estado }).toLowerCase();
      for (const termino of ['movilidad', 'reducida', 'discapacidad', 'salud', 'médica']) {
        expect(texto).not.toContain(termino);
      }
    }
  });
});

describe('avisarAccesibilidadAlAlumno (Issue 3.60)', () => {
  it('envía el aviso al chat vinculado del alumno', async () => {
    const { deps, cliente, prisma } = crearDeps({ id: 'v1', chatId: '555' });
    expect(await avisarAccesibilidadAlAlumno(APROBADA, deps)).toBe(true);
    expect(prisma.vinculacionTelegram.findFirst).toHaveBeenCalledWith({
      where: { alumnoId: 'alu-1', activo: true },
      select: { id: true, chatId: true },
    });
    expect(cliente.enviarMensaje).toHaveBeenCalledWith('555', expect.stringContaining('aprobó'));
  });

  it('sin Telegram vinculado no envía nada', async () => {
    const { deps, cliente } = crearDeps(null);
    expect(await avisarAccesibilidadAlAlumno(APROBADA, deps)).toBe(false);
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });

  it('si el envío falla lo registra sin el chat', async () => {
    const { deps, cliente } = crearDeps({ id: 'v1', chatId: '555' });
    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(400, 'chat not found'));
    const advertencia = jest.spyOn(logger, 'warn').mockImplementation(() => logger);

    expect(await avisarAccesibilidadAlAlumno(APROBADA, deps)).toBe(false);
    expect(JSON.stringify(advertencia.mock.calls)).not.toContain('555');
    advertencia.mockRestore();
  });
});
