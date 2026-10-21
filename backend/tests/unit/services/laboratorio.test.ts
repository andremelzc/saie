import { RolCuenta, TipoEspacio } from '@prisma/client';
import {
  registrarCambioPcsMalogradas,
  registrarCambioSoftware,
} from '../../../src/services/laboratorio.service';
import { TokenPayload } from '../../../src/types/auth';

const coordinacion: TokenPayload = { sub: 'cuenta-coord', rol: RolCuenta.COORDINACION_ACADEMICA };
const jefatura: TokenPayload = { sub: 'cuenta-jef', rol: RolCuenta.JEFATURA_LABORATORIOS };

/** Catálogo simulado: el endpoint recibe ids y el servicio resuelve nombre y versión. */
const CATALOGO: Record<
  string,
  { id: string; nombre: string; nombreNormalizado: string; version: string; activo: boolean }
> = {
  'sw-python': {
    id: 'sw-python',
    nombre: 'Python',
    nombreNormalizado: 'python',
    version: '3.12',
    activo: true,
  },
  'sw-git': { id: 'sw-git', nombre: 'Git', nombreNormalizado: 'git', version: '', activo: true },
  'sw-docker': {
    id: 'sw-docker',
    nombre: 'Docker',
    nombreNormalizado: 'docker',
    version: '',
    activo: true,
  },
  'sw-viejo': {
    id: 'sw-viejo',
    nombre: 'Software viejo',
    nombreNormalizado: 'software viejo',
    version: '',
    activo: false,
  },
};

function filasSoftware(ids: string[]) {
  return ids.map((id) => ({
    espacioId: 'L1',
    softwareId: id,
    software: CATALOGO[id],
  }));
}

function labBase(
  extra: { software?: string[]; pcsMalogradas?: number | null; tipo?: TipoEspacio } & Record<
    string,
    unknown
  > = {},
) {
  const { software, ...resto } = extra;
  return {
    id: 'L1',
    identificador: 'Lab 01',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'A',
    piso: 1,
    aforoNominal: 30,
    pcsMalogradas: 2,
    softwareInstaladoCatalogo: filasSoftware(software ?? ['sw-python']),
    ...resto,
  };
}

/** Prisma simulado: `$transaction` ejecuta el callback con el mismo cliente. */
function prismaMock(opciones: { espacio?: any; responsable?: boolean; asignaciones?: any[] } = {}) {
  const espacio = opciones.espacio === undefined ? labBase() : opciones.espacio;
  const db: any = {
    espacio: {
      findUnique: jest.fn().mockResolvedValue(espacio),
      update: jest.fn().mockImplementation(async ({ data }) => ({ ...espacio, ...data })),
    },
    software: {
      findMany: jest.fn().mockImplementation(async ({ where }) =>
        // `resolverSoftwareIds` pide `orderBy: { nombre: 'asc' }`: el mock lo respeta.
        Object.values(CATALOGO)
          .filter((sw) => where.id.in.includes(sw.id))
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(({ activo, ...sw }) => ({ ...sw, activo })),
      ),
    },
    espacioSoftware: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    espacioResponsable: {
      findUnique: jest.fn().mockResolvedValue(opciones.responsable ? { cuentaId: 'x' } : null),
    },
    historialEspacio: { create: jest.fn().mockResolvedValue({}) },
    asignacion: { findMany: jest.fn().mockResolvedValue(opciones.asignaciones ?? []) },
    alerta: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'alerta-1',
        tipo: data.tipo,
        espacioId: data.espacioId,
        motivo: data.motivo,
      })),
      update: jest.fn(),
    },
  };
  db.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(db));
  return db;
}

function asignacionVigente(requeridos: string[], alumnos: number, espacio = labBase()) {
  return {
    id: 'asig-1',
    seccionId: 'sec-1',
    seccion: {
      codigoSeccion: '1',
      curso: { codigo: 'ISW101', nombre: 'Programación' },
      softwareRequerido: requeridos.map((id) => ({
        comparacionVersion: 'CUALQUIERA',
        software: CATALOGO[id],
      })),
      _count: { matriculas: alumnos },
    },
    espacios: [{ espacio }],
  };
}

describe('Registrar cambio de software de un laboratorio (Issue 4.1 / 4.28)', () => {
  it('responde 404 con mensaje claro si el laboratorio no existe', async () => {
    const prisma = prismaMock({ espacio: null });
    await expect(
      registrarCambioSoftware('nope', ['sw-git'], coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining('no existe'),
    });
  });

  it('rechaza (400) un espacio que no es laboratorio', async () => {
    const prisma = prismaMock({ espacio: labBase({ tipo: TipoEspacio.AULA_TEORICA }) });
    await expect(
      registrarCambioSoftware('L1', ['sw-git'], coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it('responde 404 si algún software no está en el catálogo', async () => {
    const prisma = prismaMock();
    await expect(
      registrarCambioSoftware('L1', ['sw-git', 'sw-inexistente'], coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining('sw-inexistente'),
    });
    expect(prisma.espacioSoftware.createMany).not.toHaveBeenCalled();
  });

  it('rechaza (422) un software dado de baja', async () => {
    const prisma = prismaMock();
    await expect(
      registrarCambioSoftware('L1', ['sw-viejo'], coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('dado de baja'),
    });
  });

  it('Coordinación puede operar cualquier laboratorio sin consultar responsables', async () => {
    const prisma = prismaMock();
    await registrarCambioSoftware('L1', ['sw-git'], coordinacion, prisma);
    expect(prisma.espacioResponsable.findUnique).not.toHaveBeenCalled();
    expect(prisma.espacioSoftware.createMany).toHaveBeenCalled();
  });

  it('Jefatura responsable del laboratorio puede operarlo', async () => {
    const prisma = prismaMock({ responsable: true });
    await registrarCambioSoftware('L1', ['sw-git'], jefatura, prisma);
    expect(prisma.espacioResponsable.findUnique).toHaveBeenCalledWith({
      where: { cuentaId_espacioId: { cuentaId: 'cuenta-jef', espacioId: 'L1' } },
    });
    expect(prisma.espacioSoftware.createMany).toHaveBeenCalled();
  });

  it('Jefatura que no es responsable recibe 403 y no se persiste nada', async () => {
    const prisma = prismaMock({ responsable: false });
    await expect(registrarCambioSoftware('L1', ['sw-git'], jefatura, prisma)).rejects.toMatchObject(
      {
        status: 403,
      },
    );
    expect(prisma.espacioSoftware.createMany).not.toHaveBeenCalled();
    expect(prisma.historialEspacio.create).not.toHaveBeenCalled();
  });

  it('otros roles reciben 403', async () => {
    const prisma = prismaMock();
    const docente: TokenPayload = { sub: 'd', rol: RolCuenta.DOCENTE };
    await expect(registrarCambioSoftware('L1', ['sw-git'], docente, prisma)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('reemplaza las relaciones del catálogo y registra historial con nombre y versión', async () => {
    const prisma = prismaMock();
    await registrarCambioSoftware('L1', ['sw-docker', 'sw-git'], coordinacion, prisma);

    expect(prisma.espacioSoftware.deleteMany).toHaveBeenCalledWith({
      where: { espacioId: 'L1' },
    });
    expect(prisma.espacioSoftware.createMany).toHaveBeenCalledWith({
      data: [
        { espacioId: 'L1', softwareId: 'sw-docker', registradoPorId: 'cuenta-coord' },
        { espacioId: 'L1', softwareId: 'sw-git', registradoPorId: 'cuenta-coord' },
      ],
    });
    expect(prisma.historialEspacio.create).toHaveBeenCalledWith({
      data: {
        espacioId: 'L1',
        campo: 'SOFTWARE',
        valorAnterior: JSON.stringify(['Python 3.12']),
        valorNuevo: JSON.stringify(['Docker', 'Git']),
        cuentaId: 'cuenta-coord',
      },
    });
  });

  it('dispara la evaluación (Issue 4.3) y persiste la alerta (Issue 4.5) en la misma transacción', async () => {
    const prisma = prismaMock({
      asignaciones: [asignacionVigente(['sw-docker'], 20, labBase({ software: ['sw-docker'] }))],
    });

    const res = await registrarCambioSoftware('L1', ['sw-git'], coordinacion, prisma);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.asignacion.findMany).toHaveBeenCalled();
    expect(res.cambioRegistrado).toBe(true);
    expect(res.alertas).toHaveLength(1);
    expect(res.alertas[0]).toMatchObject({ tipo: 'SOFTWARE', espacioId: 'L1', creada: true });
    expect(prisma.alerta.create.mock.calls[0][0].data.motivo).toContain('Docker');
  });

  it('sin asignaciones afectadas guarda el cambio pero no crea alerta', async () => {
    const prisma = prismaMock({ asignaciones: [asignacionVigente([], 20)] });
    const res = await registrarCambioSoftware('L1', ['sw-git'], coordinacion, prisma);
    expect(res.cambioRegistrado).toBe(true);
    expect(res.alertas).toEqual([]);
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it('si el software enviado ya era el vigente no registra historial ni evalúa', async () => {
    const prisma = prismaMock();
    const res = await registrarCambioSoftware('L1', ['sw-python'], coordinacion, prisma);
    expect(res.cambioRegistrado).toBe(false);
    expect(prisma.espacioSoftware.deleteMany).not.toHaveBeenCalled();
    expect(prisma.historialEspacio.create).not.toHaveBeenCalled();
    expect(prisma.asignacion.findMany).not.toHaveBeenCalled();
  });

  it('devuelve el software instalado con su nombre y versión', async () => {
    const prisma = prismaMock();
    const res = await registrarCambioSoftware('L1', ['sw-python', 'sw-git'], coordinacion, prisma);
    expect(res.laboratorio.softwareInstalado).toEqual([
      { id: 'sw-git', nombre: 'Git', version: '' },
      { id: 'sw-python', nombre: 'Python', version: '3.12' },
    ]);
  });
});

describe('Registrar cambio de PCs malogradas (Issue 4.2)', () => {
  it('responde 404 si el laboratorio no existe', async () => {
    const prisma = prismaMock({ espacio: null });
    await expect(
      registrarCambioPcsMalogradas('nope', 3, coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('rechaza con 422 un conteo que excede el aforo nominal', async () => {
    const prisma = prismaMock();
    await expect(
      registrarCambioPcsMalogradas('L1', 31, coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('excede el aforo nominal'),
    });
    expect(prisma.espacio.update).not.toHaveBeenCalled();
  });

  it('acepta un conteo igual al aforo nominal', async () => {
    const prisma = prismaMock();
    const res = await registrarCambioPcsMalogradas('L1', 30, coordinacion, prisma);
    expect(res.laboratorio.pcsMalogradas).toBe(30);
  });

  it('Jefatura no responsable recibe 403', async () => {
    const prisma = prismaMock({ responsable: false });
    await expect(registrarCambioPcsMalogradas('L1', 3, jefatura, prisma)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('persiste el conteo y registra historial', async () => {
    const prisma = prismaMock();
    await registrarCambioPcsMalogradas('L1', 5, coordinacion, prisma);

    expect(prisma.espacio.update).toHaveBeenCalledWith({
      where: { id: 'L1' },
      data: { pcsMalogradas: 5 },
    });
    expect(prisma.historialEspacio.create).toHaveBeenCalledWith({
      data: {
        espacioId: 'L1',
        campo: 'PCS_MALOGRADAS',
        valorAnterior: '2',
        valorNuevo: '5',
        cuentaId: 'cuenta-coord',
      },
    });
  });

  it('valorAnterior es null cuando el laboratorio no tenía conteo previo', async () => {
    const prisma = prismaMock({ espacio: labBase({ pcsMalogradas: null }) });
    await registrarCambioPcsMalogradas('L1', 4, coordinacion, prisma);
    expect(prisma.historialEspacio.create.mock.calls[0][0].data.valorAnterior).toBeNull();
  });

  it('dispara la evaluación de capacidad (Issue 4.4) y persiste la alerta', async () => {
    const prisma = prismaMock({ asignaciones: [asignacionVigente([], 28)] });

    const res = await registrarCambioPcsMalogradas('L1', 5, coordinacion, prisma);

    expect(res.alertas).toHaveLength(1);
    expect(res.alertas[0]).toMatchObject({ tipo: 'CAPACIDAD', creada: true });
  });

  it('PCs reparadas: sube la capacidad y no se crea alerta', async () => {
    const prisma = prismaMock({
      espacio: labBase({ pcsMalogradas: 10 }),
      asignaciones: [asignacionVigente([], 28, labBase({ pcsMalogradas: 10 }))],
    });

    const res = await registrarCambioPcsMalogradas('L1', 0, coordinacion, prisma);

    expect(res.cambioRegistrado).toBe(true);
    expect(res.alertas).toEqual([]);
  });

  it('mismo conteo que el vigente: no registra historial', async () => {
    const prisma = prismaMock();
    const res = await registrarCambioPcsMalogradas('L1', 2, coordinacion, prisma);
    expect(res.cambioRegistrado).toBe(false);
    expect(prisma.historialEspacio.create).not.toHaveBeenCalled();
  });
});
