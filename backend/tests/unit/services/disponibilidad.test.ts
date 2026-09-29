import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import {
  calcularEspaciosDisponibles,
  haySolapamientoHorario,
  consultarEspaciosDisponibles,
  HorarioSlot,
  AsignacionOcupacionInput,
} from '../../../src/services/disponibilidad.service';

describe('Issue 2.4 / 5.3 - Disponibilidad de Espacios por Horario (No doble reserva)', () => {
  describe('Función auxiliar: haySolapamientoHorario', () => {
    test('detecta solapamiento parcial en el mismo día', () => {
      const slot1: HorarioSlot = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      };
      const slot2: HorarioSlot = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '09:00',
        horaFin: '11:00',
      };

      expect(haySolapamientoHorario(slot1, slot2)).toBe(true);
      expect(haySolapamientoHorario(slot2, slot1)).toBe(true);
    });

    test('detecta inclusión total (un horario dentro de otro)', () => {
      const slot1: HorarioSlot = {
        diaSemana: DiaSemana.MIERCOLES,
        horaInicio: '08:00',
        horaFin: '12:00',
      };
      const slot2: HorarioSlot = {
        diaSemana: DiaSemana.MIERCOLES,
        horaInicio: '09:00',
        horaFin: '11:00',
      };

      expect(haySolapamientoHorario(slot1, slot2)).toBe(true);
    });

    test('NO se solapan si un rango termina justo cuando el otro empieza', () => {
      const slot1: HorarioSlot = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      };
      const slot2: HorarioSlot = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '10:00',
        horaFin: '12:00',
      };

      expect(haySolapamientoHorario(slot1, slot2)).toBe(false);
      expect(haySolapamientoHorario(slot2, slot1)).toBe(false);
    });

    test('NO se solapan si son en días distintos aunque coincida la hora', () => {
      const slot1: HorarioSlot = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      };
      const slot2: HorarioSlot = {
        diaSemana: DiaSemana.MARTES,
        horaInicio: '08:00',
        horaFin: '10:00',
      };

      expect(haySolapamientoHorario(slot1, slot2)).toBe(false);
    });
  });

  describe('Función pura: calcularEspaciosDisponibles', () => {
    const espacios = [
      { id: 'aula-101', identificador: 'Aula 101', tipo: TipoEspacio.AULA_TEORICA },
      { id: 'aula-102', identificador: 'Aula 102', tipo: TipoEspacio.AULA_TEORICA },
      { id: 'lab-101', identificador: 'Lab 101', tipo: TipoEspacio.LABORATORIO },
      { id: 'lab-102', identificador: 'Lab 102', tipo: TipoEspacio.LABORATORIO },
    ];

    test('un espacio con asignación VIGENTE solapada no debe estar disponible', () => {
      const horarioConsulta: HorarioSlot = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      };

      const asignaciones: AsignacionOcupacionInput[] = [
        {
          id: 'asig-1',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-101'],
          horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '11:00' }],
        },
      ];

      const disponibles = calcularEspaciosDisponibles(
        horarioConsulta,
        TipoEspacio.AULA_TEORICA,
        espacios,
        asignaciones,
      );

      // Solo Aula 102 debe estar disponible (Aula 101 está ocupada)
      expect(disponibles.map((e) => e.id)).toEqual(['aula-102']);
    });

    test('asignaciones HISTORICA o ESCALADA NO deben bloquear el espacio', () => {
      const horarioConsulta: HorarioSlot = {
        diaSemana: DiaSemana.VIERNES,
        horaInicio: '14:00',
        horaFin: '16:00',
      };

      const asignaciones: AsignacionOcupacionInput[] = [
        {
          id: 'asig-hist',
          estado: EstadoAsignacion.HISTORICA,
          espacioIds: ['lab-101'],
          horarios: [{ diaSemana: DiaSemana.VIERNES, horaInicio: '14:00', horaFin: '16:00' }],
        },
        {
          id: 'asig-esc',
          estado: EstadoAsignacion.ESCALADA,
          espacioIds: ['lab-102'],
          horarios: [{ diaSemana: DiaSemana.VIERNES, horaInicio: '14:00', horaFin: '16:00' }],
        },
      ];

      const disponibles = calcularEspaciosDisponibles(
        horarioConsulta,
        TipoEspacio.LABORATORIO,
        espacios,
        asignaciones,
      );

      // Ambos laboratorios deben figurar como disponibles
      expect(disponibles.map((e) => e.id)).toEqual(['lab-101', 'lab-102']);
    });

    test('filtra estrictamente por el tipo de espacio solicitado', () => {
      const horarioConsulta: HorarioSlot = {
        diaSemana: DiaSemana.JUEVES,
        horaInicio: '10:00',
        horaFin: '12:00',
      };

      const disponibles = calcularEspaciosDisponibles(
        horarioConsulta,
        TipoEspacio.LABORATORIO,
        espacios,
        [],
      );

      expect(disponibles.every((e) => e.tipo === TipoEspacio.LABORATORIO)).toBe(true);
      expect(disponibles.map((e) => e.id)).toEqual(['lab-101', 'lab-102']);
    });
  });

  describe('Consulta de Disponibilidad con Prisma', () => {
    test('debe integrar espacios y asignaciones desde Prisma para calcular los disponibles', async () => {
      const mockPrisma = {
        espacio: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'aula-1', tipo: TipoEspacio.AULA_TEORICA },
            { id: 'aula-2', tipo: TipoEspacio.AULA_TEORICA },
          ]),
        },
        asignacion: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'asig-1',
              estado: EstadoAsignacion.VIGENTE,
              asignacionesEspacio: [{ espacioId: 'aula-1' }],
              seccion: {
                horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
              },
            },
          ]),
        },
      };

      const disponibles = await consultarEspaciosDisponibles(
        { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
        TipoEspacio.AULA_TEORICA,
        mockPrisma as any,
      );

      expect(disponibles).toHaveLength(1);
      expect(disponibles[0].id).toBe('aula-2');
    });
  });
});
