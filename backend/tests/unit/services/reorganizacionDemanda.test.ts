import { EstadoAsignacion } from '@prisma/client';
import { ejecutarReorganizacionConPrioridad } from '../../../src/services/asignacionDemanda.service';
import { procesarCorridaBatchPeriodo } from '../../../src/services/motor.service';
import { asegurarPeriodoEscribible } from '../../../src/services/periodo.service';
import { verificarCorridaPeriodo } from '../../../src/services/verificador.service';

jest.mock('../../../src/services/motor.service', () => ({
  procesarAsignacionSeccionIndividual: jest.fn(),
  procesarCorridaBatchPeriodo: jest.fn(),
}));
jest.mock('../../../src/services/verificador.service', () => ({
  verificarCorridaPeriodo: jest.fn(),
}));
jest.mock('../../../src/services/periodo.service', () => ({
  asegurarPeriodoEscribible: jest.fn(),
  obtenerPeriodoVigente: jest.fn(),
}));

const batch = jest.mocked(procesarCorridaBatchPeriodo);

describe('ejecutarReorganizacionConPrioridad (Issue 2.26)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(verificarCorridaPeriodo).mockResolvedValue(null as never);
  });

  it('corre el periodo con priorizarEscaladas y resume el resultado', async () => {
    batch.mockResolvedValue({
      corridaId: 'c1',
      resultados: [
        {
          seccionId: 'B',
          codigoSeccion: 'B',
          cursoId: 'c',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-101'],
        },
        {
          seccionId: 'A',
          codigoSeccion: 'A',
          cursoId: 'c',
          estado: EstadoAsignacion.ESCALADA,
          espacioIds: [],
          motivoEscalamiento: '[SIN_DISPONIBILIDAD] x',
        },
      ],
    } as never);

    const resumen = await ejecutarReorganizacionConPrioridad('2026-2', {} as never);

    expect(asegurarPeriodoEscribible).toHaveBeenCalledWith(expect.anything(), '2026-2');
    expect(batch).toHaveBeenCalledWith('2026-2', expect.anything(), 'DEMANDA', {
      priorizarEscaladas: true,
    });
    expect(verificarCorridaPeriodo).toHaveBeenCalledWith('2026-2', expect.anything(), 'c1');
    expect(resumen).toMatchObject({ modo: 'periodo', asignadas: 1, escaladas: 1, corridaId: 'c1' });
  });

  it('responde 409 si ya hay una corrida en curso', async () => {
    let terminar!: () => void;
    batch.mockImplementation(
      () =>
        new Promise((resolver) => {
          terminar = () => resolver({ corridaId: 'c1', resultados: [] } as never);
        }),
    );

    const primera = ejecutarReorganizacionConPrioridad('2026-2', {} as never);
    await new Promise((r) => setImmediate(r));
    await expect(ejecutarReorganizacionConPrioridad('2026-2', {} as never)).rejects.toMatchObject({
      status: 409,
    });
    terminar();
    await primera;
  });
});
