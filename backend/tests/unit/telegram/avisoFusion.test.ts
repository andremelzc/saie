import { ErrorTelegram } from '../../../src/telegram/cliente';
import { ColaEnvios } from '../../../src/telegram/cola';
import { avisarFusionALosAlumnos, formatearAvisoFusion } from '../../../src/telegram/avisoFusion';
import { SeccionFusionadaEvento } from '../../../src/events/tipos';

const evento: SeccionFusionadaEvento = {
  seccionTeoriaId: 'sec-teo',
  seccionLaboratorioId: 'sec-lab',
  codigoCurso: '202SW0805',
  nombreCurso: 'Gestión de la Configuración',
  grupo: '2',
  horarios: [
    { diaSemana: 'JUEVES', horaInicio: '18:00', horaFin: '20:00' },
    { diaSemana: 'JUEVES', horaInicio: '20:00', horaFin: '22:00' },
  ],
  espacios: [{ id: 'e1', identificador: 'L-01' }],
};

const colaInmediata = { encolar: (fn: () => Promise<unknown>) => fn() } as unknown as ColaEnvios;

describe('Aviso por Telegram de «dictar todo en laboratorio» (Issue 7.17)', () => {
  it('dice el curso y grupo, el horario completo y el laboratorio', () => {
    const texto = formatearAvisoFusion(evento);
    expect(texto).toContain('202SW0805 - Gestión de la Configuración (Grupo 2)');
    expect(texto).toContain('todas las clases se dictan en laboratorio');
    expect(texto).toContain('Horario: Jueves 18:00-20:00; Jueves 20:00-22:00');
    expect(texto).toContain('Laboratorio: L-01');
  });

  it('si el laboratorio quedó en revisión dice «por confirmar»', () => {
    expect(formatearAvisoFusion({ ...evento, espacios: [] })).toContain(
      'Laboratorio: por confirmar',
    );
  });

  it('avisa a los alumnos vinculados de la teoría o del laboratorio', async () => {
    const prisma = {
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'v1', chatId: '111' },
          { id: 'v2', chatId: '222' },
        ]),
      },
    } as any;
    const cliente = {
      enviarMensaje: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new ErrorTelegram(400, 'Bad Request')),
    } as any;

    const r = await avisarFusionALosAlumnos(evento, {
      prisma,
      cliente,
      cola: colaInmediata,
      esperar: async () => undefined,
    });

    expect(prisma.vinculacionTelegram.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          activo: true,
          alumno: { matriculas: { some: { seccionId: { in: ['sec-teo', 'sec-lab'] } } } },
        },
      }),
    );
    expect(r).toEqual({ destinatarios: 2, enviados: 1, fallidos: 1 });
  });
});
