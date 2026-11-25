import { EstadoAlerta, EstadoAsignacion, RolCuenta } from '@prisma/client';
import { reubicarSeccionesDeAlerta } from '../../../src/services/reubicacion.service';
import { ejecutarAsignacionADemanda } from '../../../src/services/asignacionDemanda.service';
import { resolverAlerta } from '../../../src/services/alerta.service';
import { TokenPayload } from '../../../src/types/auth';

jest.mock('../../../src/services/asignacionDemanda.service', () => ({
  ejecutarAsignacionADemanda: jest.fn(),
}));
jest.mock('../../../src/services/alerta.service', () => ({
  resolverAlerta: jest.fn(),
}));

const auth: TokenPayload = { sub: 'coord1', rol: RolCuenta.COORDINACION_ACADEMICA };

function afectada(asignacionId: string, seccionId: string, codigoCurso: string) {
  return {
    asignacionId,
    asignacion: { seccion: { id: seccionId, curso: { codigo: codigoCurso } } },
  };
}

function crearDb(alerta: unknown) {
  return { alerta: { findUnique: jest.fn().mockResolvedValue(alerta) } } as any;
}

function resumen(seccionId: string, estado: EstadoAsignacion, espacioIds: string[]) {
  return {
    resultados: [
      {
        seccionId,
        codigoSeccion: seccionId,
        estado,
        espacioIds,
        motivoEscalamiento: estado === EstadoAsignacion.ESCALADA ? '[HORARIO_BLOQUEADO] …' : null,
        conservada: false,
      },
    ],
  };
}

describe('Reubicar secciones desde una alerta (Issue 2.22, riesgo R3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reevalúa una vez cada sección afectada y deja la alerta resuelta', async () => {
    const db = crearDb({
      id: 'al-1',
      estado: EstadoAlerta.PENDIENTE,
      asignacionesAfectadas: [
        afectada('asig-1', 'sec-1', '202SW0805'),
        afectada('asig-1b', 'sec-1', '202SW0805'),
        afectada('asig-2', 'sec-2', '202SW0503'),
      ],
    });
    (ejecutarAsignacionADemanda as jest.Mock)
      .mockResolvedValueOnce(resumen('sec-1', EstadoAsignacion.VIGENTE, ['lab-04']))
      .mockResolvedValueOnce(resumen('sec-2', EstadoAsignacion.ESCALADA, []));

    const resultado = await reubicarSeccionesDeAlerta('al-1', auth, db);

    expect(ejecutarAsignacionADemanda).toHaveBeenCalledTimes(2);
    expect(ejecutarAsignacionADemanda).toHaveBeenNthCalledWith(1, 'sec-1', db);
    expect(ejecutarAsignacionADemanda).toHaveBeenNthCalledWith(2, 'sec-2', db);
    expect(resolverAlerta).toHaveBeenCalledWith('al-1', auth, db);
    expect(resultado.alertaResuelta).toBe(true);
    expect(resultado.secciones).toEqual([
      expect.objectContaining({ seccionId: 'sec-1', codigoCurso: '202SW0805', estado: 'VIGENTE' }),
      expect.objectContaining({ seccionId: 'sec-2', codigoCurso: '202SW0503', estado: 'ESCALADA' }),
    ]);
  });

  it('404 si la alerta no existe', async () => {
    await expect(reubicarSeccionesDeAlerta('nada', auth, crearDb(null))).rejects.toMatchObject({
      status: 404,
    });
    expect(ejecutarAsignacionADemanda).not.toHaveBeenCalled();
  });

  it('409 si la alerta ya fue resuelta', async () => {
    const db = crearDb({ id: 'al-1', estado: EstadoAlerta.RESUELTA, asignacionesAfectadas: [] });
    await expect(reubicarSeccionesDeAlerta('al-1', auth, db)).rejects.toMatchObject({
      status: 409,
    });
    expect(ejecutarAsignacionADemanda).not.toHaveBeenCalled();
    expect(resolverAlerta).not.toHaveBeenCalled();
  });
});
