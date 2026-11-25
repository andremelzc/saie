import { DiaSemana } from '@prisma/client';
import {
  consultarClaseActual,
  consultarClasesHoy,
  consultarHorarioSemanal,
} from '../../../src/telegram/consultasBot.service';

describe('consultasBot.service', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      vinculacionTelegram: {
        findUnique: jest.fn(),
      },
      periodo: {
        findFirst: jest.fn().mockResolvedValue({ codigo: '2026-1' }),
      },
      matricula: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  });

  it('avisa si el chat no está vinculado', async () => {
    prisma.vinculacionTelegram.findUnique.mockResolvedValue(null);

    const resHoy = await consultarClasesHoy('123', prisma);
    expect(resHoy).toContain('No tienes una cuenta vinculada');

    const resAhora = await consultarClaseActual('123', prisma);
    expect(resAhora).toContain('No tienes una cuenta vinculada');

    const resHorario = await consultarHorarioSemanal('123', prisma);
    expect(resHorario).toContain('No tienes una cuenta vinculada');
  });

  it('informa si el alumno no tiene clases hoy', async () => {
    prisma.vinculacionTelegram.findUnique.mockResolvedValue({
      activo: true,
      alumnoId: 'al-1',
      alumno: { id: 'al-1', nombre: 'Juan' },
    });
    prisma.matricula.findMany.mockResolvedValue([]);

    // Lunes al mediodía (19 de Octubre 2026 es lunes)
    const fecha = new Date('2026-10-19T17:00:00.000Z'); // 12:00 Lima
    const res = await consultarClasesHoy('123', prisma, fecha);
    expect(res).toContain('no tienes clases programadas');
  });

  it('muestra las clases de hoy ordenadas por hora', async () => {
    prisma.vinculacionTelegram.findUnique.mockResolvedValue({
      activo: true,
      alumnoId: 'al-1',
      alumno: { id: 'al-1', nombre: 'Juan' },
    });

    prisma.matricula.findMany.mockResolvedValue([
      {
        seccion: {
          id: 'sec-1',
          codigoSeccion: '1',
          curso: { codigo: 'CC-101', nombre: 'Algoritmos' },
          docente: { nombre: 'Profesor X' },
          horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
          asignaciones: [
            {
              estado: 'VIGENTE',
              espacios: [{ espacio: { identificador: 'Aula 101', pabellon: 'A', piso: 1 } }],
            },
          ],
        },
      },
    ]);

    const fecha = new Date('2026-10-19T17:00:00.000Z'); // Lunes
    const res = await consultarClasesHoy('123', prisma, fecha);
    expect(res).toContain('CC-101 - Algoritmos');
    expect(res).toContain('Aula 101');
    expect(res).toContain('08:00 - 10:00');
  });

  it('agrupa teoría y laboratorio del mismo grupo con /hoy y rotula el tipo (Issue 3.62)', async () => {
    prisma.vinculacionTelegram.findUnique.mockResolvedValue({
      activo: true,
      alumnoId: 'al-1',
      alumno: { id: 'al-1', nombre: 'Juan' },
    });

    const curso = { codigo: '202SW0805', nombre: 'Gestión de la Configuración' };
    prisma.matricula.findMany.mockResolvedValue([
      {
        seccion: {
          id: 'sec-lab',
          codigoSeccion: '2-LAB',
          tipoEspacioRequerido: 'LABORATORIO',
          curso,
          docente: null,
          horarios: [{ diaSemana: DiaSemana.JUEVES, horaInicio: '20:00', horaFin: '22:00' }],
          asignaciones: [
            {
              estado: 'VIGENTE',
              espacios: [{ espacio: { identificador: 'Laboratorio 01', pabellon: 'N', piso: 2 } }],
            },
          ],
        },
      },
      {
        seccion: {
          id: 'sec-teo',
          codigoSeccion: '2',
          tipoEspacioRequerido: 'AULA_TEORICA',
          curso,
          docente: null,
          horarios: [{ diaSemana: DiaSemana.JUEVES, horaInicio: '18:00', horaFin: '20:00' }],
          asignaciones: [
            {
              estado: 'VIGENTE',
              espacios: [{ espacio: { identificador: 'Aula 105', pabellon: 'A', piso: 1 } }],
            },
          ],
        },
      },
    ]);

    const fecha = new Date('2026-10-22T15:00:00.000Z'); // Jueves 10:00 Lima
    const res = await consultarClasesHoy('123', prisma, fecha);

    expect(res.match(/202SW0805/g)).toHaveLength(1);
    expect(res).toContain('202SW0805 - Gestión de la Configuración (Grupo 2)');
    expect(res).toContain('• Teoría: 18:00 - 20:00 | 📍 Aula 105');
    expect(res).toContain('• Laboratorio: 20:00 - 22:00 | 📍 Laboratorio 01');
    expect(res).not.toContain('2-LAB');

    const proxima = await consultarClaseActual('123', prisma, fecha);
    expect(proxima).toContain('(Grupo 2 · Teoría)');
  });

  it('detecta si el alumno está actualmente en clase con /ahora', async () => {
    prisma.vinculacionTelegram.findUnique.mockResolvedValue({
      activo: true,
      alumnoId: 'al-1',
      alumno: { id: 'al-1', nombre: 'Juan' },
    });

    prisma.matricula.findMany.mockResolvedValue([
      {
        seccion: {
          id: 'sec-1',
          codigoSeccion: '1',
          curso: { codigo: 'CC-101', nombre: 'Algoritmos' },
          docente: { nombre: 'Profesor X' },
          horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
          asignaciones: [
            {
              estado: 'VIGENTE',
              espacios: [{ espacio: { identificador: 'Aula 101', pabellon: 'A', piso: 1 } }],
            },
          ],
        },
      },
    ]);

    // 09:00 hora de Lima (14:00 UTC) -> dentro del horario 08:00 - 10:00
    const fecha = new Date('2026-10-19T14:00:00.000Z');
    const res = await consultarClaseActual('123', prisma, fecha);
    expect(res).toContain('En este momento estás en horario de clase');
    expect(res).toContain('Aula 101');
    expect(res).toContain('termina en 60 min');
  });

  it('informa la próxima clase del día si aún no ha comenzado', async () => {
    prisma.vinculacionTelegram.findUnique.mockResolvedValue({
      activo: true,
      alumnoId: 'al-1',
      alumno: { id: 'al-1', nombre: 'Juan' },
    });

    prisma.matricula.findMany.mockResolvedValue([
      {
        seccion: {
          id: 'sec-1',
          codigoSeccion: '1',
          curso: { codigo: 'CC-101', nombre: 'Algoritmos' },
          docente: { nombre: 'Profesor X' },
          horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '14:00', horaFin: '16:00' }],
          asignaciones: [
            {
              estado: 'VIGENTE',
              espacios: [{ espacio: { identificador: 'Aula 202', pabellon: 'B', piso: 2 } }],
            },
          ],
        },
      },
    ]);

    // 10:00 hora de Lima (15:00 UTC) -> falta para las 14:00
    const fecha = new Date('2026-10-19T15:00:00.000Z');
    const res = await consultarClaseActual('123', prisma, fecha);
    expect(res).toContain('Tu próxima clase de hoy es');
    expect(res).toContain('Aula 202');
    expect(res).toContain('comienza en 240 min');
  });

  it('formatea el horario semanal completo agrupado por día con /horario', async () => {
    prisma.vinculacionTelegram.findUnique.mockResolvedValue({
      activo: true,
      alumnoId: 'al-1',
      alumno: { id: 'al-1', nombre: 'Juan' },
    });

    prisma.matricula.findMany.mockResolvedValue([
      {
        seccion: {
          id: 'sec-1',
          codigoSeccion: '1',
          curso: { codigo: 'CC-101', nombre: 'Algoritmos' },
          docente: { nombre: 'Profesor X' },
          horarios: [
            { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
            { diaSemana: DiaSemana.MIERCOLES, horaInicio: '10:00', horaFin: '12:00' },
          ],
          asignaciones: [
            {
              estado: 'VIGENTE',
              espacios: [{ espacio: { identificador: 'Lab 1', pabellon: 'A', piso: 1 } }],
            },
          ],
        },
      },
    ]);

    const res = await consultarHorarioSemanal('123', prisma);
    expect(res).toContain('Tu horario semanal');
    expect(res).toContain('LUNES');
    expect(res).toContain('MIÉRCOLES');
    expect(res).toContain('Lab 1');
  });
});
