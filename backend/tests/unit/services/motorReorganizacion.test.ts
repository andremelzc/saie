import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { bus } from '../../../src/events/bus';
import {
  procesarCorridaBatchPeriodo,
  simularReorganizacion,
} from '../../../src/services/motor.service';

/**
 * Issue 2.26: una sola aula a esa hora. La sección A la tiene y la B está escalada. La
 * reorganización atiende primero a B y A se queda sin aula; ambas reciben aviso.
 */

const horario = [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }];
const seccionDb = (id: string, alumnos: number) => ({
  id,
  cursoId: `cur-${id}`,
  codigoSeccion: id,
  periodo: '2026-2',
  tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
  curso: { codigo: `CC-${id}`, nombre: `Curso ${id}` },
  horarios: horario,
  matriculas: Array.from({ length: alumnos }, () => ({ movilidadReducida: false })),
  softwareRequerido: [],
});

function crearPrisma() {
  return {
    espacio: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'aula-101',
          identificador: 'Aula 101',
          pabellon: 'A',
          piso: 1,
          tipo: TipoEspacio.AULA_TEORICA,
          aforoNominal: 30,
          pcsMalogradas: null,
          softwareInstalado: [],
        },
      ]),
    },
    espacioContiguo: { findMany: jest.fn().mockResolvedValue([]) },
    seccion: { findMany: jest.fn().mockResolvedValue([seccionDb('A', 28), seccionDb('B', 20)]) },
    asignacion: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'asig-A',
          seccionId: 'A',
          estado: EstadoAsignacion.VIGENTE,
          espacios: [{ espacioId: 'aula-101' }],
          seccion: { horarios: horario },
          huellaEntrada: null,
          motivoEscalamiento: null,
        },
        {
          id: 'asig-B',
          seccionId: 'B',
          estado: EstadoAsignacion.ESCALADA,
          espacios: [],
          seccion: { horarios: horario },
          huellaEntrada: null,
          motivoEscalamiento: '[SIN_DISPONIBILIDAD] x',
        },
      ]),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    asignacionEspacio: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    registroAuditoria: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    $transaction: jest.fn().mockImplementation(async (operaciones) => Promise.all(operaciones)),
  };
}

describe('motor y reorganización con prioridad (Issue 2.26)', () => {
  let emitir: jest.SpyInstance;

  beforeEach(() => {
    emitir = jest.spyOn(bus, 'emitir').mockResolvedValue(undefined);
  });

  afterEach(() => emitir.mockRestore());

  it('simularReorganizacion cuenta los cambios sin escribir nada', async () => {
    const prisma = crearPrisma();

    const simulacion = await simularReorganizacion('2026-2', prisma as never);

    expect(simulacion).toEqual({
      totalEscaladas: 1,
      escaladasConAula: 1,
      cambianDeAula: 0,
      pierdenAula: 1,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('la corrida con prioridad avisa a la escalada que consigue aula y a la que la pierde', async () => {
    const prisma = crearPrisma();

    await procesarCorridaBatchPeriodo('2026-2', prisma as never, 'DEMANDA', {
      priorizarEscaladas: true,
    });

    const eventos = emitir.mock.calls
      .filter(([nombre]) => nombre === 'asignacion.cambiada')
      .map(([, evento]) => evento);
    expect(eventos).toHaveLength(2);
    expect(eventos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seccionId: 'B',
          espaciosAnteriores: [],
          espaciosNuevos: [{ id: 'aula-101', identificador: 'Aula 101' }],
        }),
        expect.objectContaining({
          seccionId: 'A',
          espaciosAnteriores: [{ id: 'aula-101', identificador: 'Aula 101' }],
          espaciosNuevos: [],
        }),
      ]),
    );
  });

  it('sin la opción, pasar de escalada a tener aula no genera el aviso adicional', async () => {
    const prisma = crearPrisma();
    // Sin la opción A se reasigna igual (su huella no coincide) y B sigue escalada: nadie cambia
    // de un aula a otra, así que no hay avisos.
    await procesarCorridaBatchPeriodo('2026-2', prisma as never);
    expect(emitir.mock.calls.filter(([n]) => n === 'asignacion.cambiada')).toHaveLength(0);
  });
});
