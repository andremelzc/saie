import { DiaSemana } from '@prisma/client';
import { importarHorarios } from '../../../src/importers/horarios.importer';

describe('Importador de Horarios (Issue 1.4)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      curso: {
        findUnique: jest.fn().mockResolvedValue({ id: 'curso-123', codigo: '2020101' }),
      },
      seccion: {
        findUnique: jest.fn().mockResolvedValue({ id: 'seccion-123', codigoSeccion: 'S1' }),
      },
      horario: {
        upsert: jest.fn().mockResolvedValue({ id: 'horario-123' }),
      },
    };
  });

  it('debe procesar un horario válido correctamente', async () => {
    const datos = [
      {
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    ];

    const resultado = await importarHorarios(datos, mockPrisma);

    expect(resultado.horariosProcesados).toBe(1);
    expect(resultado.errores).toHaveLength(0);
    expect(mockPrisma.horario.upsert).toHaveBeenCalled();
  });

  it('debe rechazar un horario donde la hora de inicio es igual o posterior a la de fin', async () => {
    const datos = [
      {
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        diaSemana: DiaSemana.MARTES,
        horaInicio: '10:00',
        horaFin: '08:00',
      },
      {
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        diaSemana: DiaSemana.MIERCOLES,
        horaInicio: '10:00',
        horaFin: '10:00',
      },
    ];

    const resultado = await importarHorarios(datos, mockPrisma);

    expect(resultado.horariosProcesados).toBe(0);
    expect(resultado.errores).toHaveLength(2);
    expect(resultado.errores[0]).toContain(
      'hora de inicio (10:00) debe ser menor a la hora de fin (08:00)',
    );
    expect(resultado.errores[1]).toContain(
      'hora de inicio (10:00) debe ser menor a la hora de fin (10:00)',
    );
  });

  it('debe rechazar formatos de hora inválidos', async () => {
    const datos = [
      {
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        diaSemana: DiaSemana.MIERCOLES,
        horaInicio: '8:00 AM', // Formato no 24h
        horaFin: '10:00',
      },
    ];

    const resultado = await importarHorarios(datos, mockPrisma);

    expect(resultado.horariosProcesados).toBe(0);
    expect(resultado.errores.length).toBeGreaterThan(0);
  });

  it('debe registrar error si el curso no existe', async () => {
    mockPrisma.curso.findUnique.mockResolvedValue(null);

    const datos = [
      {
        codigoCurso: 'CURSO_INEXISTENTE',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    ];

    const resultado = await importarHorarios(datos, mockPrisma);

    expect(resultado.horariosProcesados).toBe(0);
    expect(resultado.errores[0]).toContain('No existe el curso con código CURSO_INEXISTENTE');
  });

  it('debe registrar error si la sección no existe', async () => {
    mockPrisma.seccion.findUnique.mockResolvedValue(null);

    const datos = [
      {
        codigoCurso: '2020101',
        codigoSeccion: 'SECCION_INEXISTENTE',
        periodo: '2026-1',
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    ];

    const resultado = await importarHorarios(datos, mockPrisma);

    expect(resultado.horariosProcesados).toBe(0);
    expect(resultado.errores[0]).toContain('No existe la sección SECCION_INEXISTENTE');
  });

  it('debe capturar errores de base de datos durante el upsert de horario', async () => {
    mockPrisma.horario.upsert.mockRejectedValue(new Error('Fallo de BD en horario'));

    const datos = [
      {
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    ];

    const resultado = await importarHorarios(datos, mockPrisma);

    expect(resultado.horariosProcesados).toBe(0);
    expect(resultado.errores[0]).toContain('Fallo de BD en horario');
  });
});
