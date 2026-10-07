import { RolCuenta, TipoEspacio } from '@prisma/client';
import {
  normalizarListaSoftware,
  registrarCambioPcsMalogradas,
  registrarCambioSoftware,
} from '../../../src/services/laboratorio.service';
import { TokenPayload } from '../../../src/types/auth';

const coordinacion: TokenPayload = { sub: 'cuenta-coord', rol: RolCuenta.COORDINACION_ACADEMICA };
const jefatura: TokenPayload = { sub: 'cuenta-jef', rol: RolCuenta.JEFATURA_LABORATORIOS };

function labBase(extra: Record<string, unknown> = {}) {
  return {
    id: 'L1',
    identificador: 'Lab 01',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'A',
    piso: 1,
    aforoNominal: 30,
    softwareInstalado: ['Python'],
    pcsMalogradas: 2,
    ...extra,
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

function asignacionVigente(stack: string[], alumnos: number, espacio = labBase()) {
  return {
    id: 'asig-1',
    seccionId: 'sec-1',
    seccion: {
      codigoSeccion: '1',
      curso: { codigo: 'ISW101', nombre: 'Programación' },
      stackSoftwareRequerido: stack,
      _count: { matriculas: alumnos },
    },
    espacios: [{ espacio }],
  };
}

describe('normalizarListaSoftware', () => {
  it('recorta, quita vacíos y duplicados sin distinguir mayúsculas', () => {
    expect(
      normalizarListaSoftware([' Python ', 'python', '', '  ', 'Visual   Studio', 'Git']),
    ).toEqual(['Python', 'Visual Studio', 'Git']);
  });
});

describe('Registrar cambio de software de un laboratorio (Issue 4.1)', () => {
  it('responde 404 con mensaje claro si el laboratorio no existe', async () => {
    const prisma = prismaMock({ espacio: null });
    await expect(
      registrarCambioSoftware('nope', ['Git'], coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining('no existe'),
    });
  });

  it('rechaza (400) un espacio que no es laboratorio', async () => {
    const prisma = prismaMock({ espacio: labBase({ tipo: TipoEspacio.AULA_TEORICA }) });
    await expect(
      registrarCambioSoftware('L1', ['Git'], coordinacion, prisma),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it('Coordinación puede operar cualquier laboratorio sin consultar responsables', async () => {
    const prisma = prismaMock();
    await registrarCambioSoftware('L1', ['Git'], coordinacion, prisma);
    expect(prisma.espacioResponsable.findUnique).not.toHaveBeenCalled();
    expect(prisma.espacio.update).toHaveBeenCalled();
  });

  it('Jefatura responsable del laboratorio puede operarlo', async () => {
    const prisma = prismaMock({ responsable: true });
    await registrarCambioSoftware('L1', ['Git'], jefatura, prisma);
    expect(prisma.espacioResponsable.findUnique).toHaveBeenCalledWith({
      where: { cuentaId_espacioId: { cuentaId: 'cuenta-jef', espacioId: 'L1' } },
    });
    expect(prisma.espacio.update).toHaveBeenCalled();
  });

  it('Jefatura que no es responsable recibe 403 y no se persiste nada', async () => {
    const prisma = prismaMock({ responsable: false });
    await expect(registrarCambioSoftware('L1', ['Git'], jefatura, prisma)).rejects.toMatchObject({
      status: 403,
    });
    expect(prisma.espacio.update).not.toHaveBeenCalled();
    expect(prisma.historialEspacio.create).not.toHaveBeenCalled();
  });

  it('otros roles reciben 403', async () => {
    const prisma = prismaMock();
    const docente: TokenPayload = { sub: 'd', rol: RolCuenta.DOCENTE };
    await expect(registrarCambioSoftware('L1', ['Git'], docente, prisma)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('persiste el software y registra historial con valor anterior, nuevo y cuenta', async () => {
    const prisma = prismaMock();
    await registrarCambioSoftware('L1', ['Git', ' Docker '], coordinacion, prisma);

    expect(prisma.espacio.update).toHaveBeenCalledWith({
      where: { id: 'L1' },
      data: { softwareInstalado: ['Git', 'Docker'] },
    });
    expect(prisma.historialEspacio.create).toHaveBeenCalledWith({
      data: {
        espacioId: 'L1',
        campo: 'SOFTWARE',
        valorAnterior: JSON.stringify(['Python']),
        valorNuevo: JSON.stringify(['Git', 'Docker']),
        cuentaId: 'cuenta-coord',
      },
    });
  });

  it('dispara la evaluación (Issue 4.3) y persiste la alerta (Issue 4.5) en la misma transacción', async () => {
    const prisma = prismaMock({
      asignaciones: [asignacionVigente(['Docker'], 20, labBase({ softwareInstalado: ['Docker'] }))],
    });

    const res = await registrarCambioSoftware('L1', ['Git'], coordinacion, prisma);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.asignacion.findMany).toHaveBeenCalled();
    expect(res.cambioRegistrado).toBe(true);
    expect(res.alertas).toHaveLength(1);
    expect(res.alertas[0]).toMatchObject({ tipo: 'SOFTWARE', espacioId: 'L1', creada: true });
    expect(prisma.alerta.create.mock.calls[0][0].data.motivo).toContain('Docker');
  });

  it('sin asignaciones afectadas guarda el cambio pero no crea alerta', async () => {
    const prisma = prismaMock({ asignaciones: [asignacionVigente([], 20)] });
    const res = await registrarCambioSoftware('L1', ['Git'], coordinacion, prisma);
    expect(res.cambioRegistrado).toBe(true);
    expect(res.alertas).toEqual([]);
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it('si el software enviado ya era el vigente no registra historial ni evalúa', async () => {
    const prisma = prismaMock();
    const res = await registrarCambioSoftware('L1', ['python'], coordinacion, prisma);
    expect(res.cambioRegistrado).toBe(false);
    expect(prisma.espacio.update).not.toHaveBeenCalled();
    expect(prisma.historialEspacio.create).not.toHaveBeenCalled();
    expect(prisma.asignacion.findMany).not.toHaveBeenCalled();
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
