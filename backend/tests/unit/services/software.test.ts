import { CategoriaSoftware, Prisma, TipoLicencia } from '@prisma/client';
import {
  SoftwareCrearSchema,
  SoftwareEditarSchema,
  sembrarCatalogoSoftware,
  cambiarEstadoSoftware,
  crearSoftware,
  editarSoftware,
  listarSoftware,
  obtenerSoftwarePorId,
  resolverSoftwareIds,
  resolverSoftwarePorNombre,
} from '../../../src/services/software.service';
import { TokenPayload } from '../../../src/types/auth';

const auth: TokenPayload = { sub: 'coord-1', rol: 'COORDINACION_ACADEMICA' as any };

function fila(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sw-1',
    nombre: 'Python',
    nombreNormalizado: 'python',
    version: '3.12',
    categoria: CategoriaSoftware.LENGUAJE,
    tipoLicencia: TipoLicencia.LIBRE,
    descripcion: null,
    fabricante: null,
    activo: true,
    creadoPorId: 'coord-1',
    fechaCreacion: new Date('2026-01-01T00:00:00Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00Z'),
    _count: { espacios: 2, secciones: 3 },
    ...overrides,
  };
}

function conflictoUnico() {
  return new Prisma.PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '1' });
}

describe('Catálogo de software (Issue 4.28)', () => {
  describe('esquemas', () => {
    it('SoftwareCrearSchema normaliza versión vacía y exige categoría', () => {
      const datos = SoftwareCrearSchema.parse({
        nombre: ' Git ',
        categoria: CategoriaSoftware.IDE,
      });
      expect(datos).toMatchObject({ nombre: 'Git', version: '', tipoLicencia: 'LIBRE' });
      expect(() => SoftwareCrearSchema.parse({ nombre: 'Git' })).toThrow();
    });

    it('SoftwareEditarSchema no permite cambiar la versión', () => {
      expect(() => SoftwareEditarSchema.parse({ version: '4.0' })).toThrow();
      expect(() => SoftwareEditarSchema.parse({})).toThrow();
    });
  });

  describe('listarSoftware', () => {
    it('traduce los filtros a Prisma y devuelve el uso en laboratorios y secciones', async () => {
      const db = {
        software: {
          count: jest.fn().mockResolvedValue(1),
          findMany: jest.fn().mockResolvedValue([fila()]),
        },
      } as any;

      const res = await listarSoftware(
        { q: 'py', categoria: CategoriaSoftware.LENGUAJE, activo: true, page: 2, limit: 10 },
        db,
      );

      expect(db.software.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            nombre: { contains: 'py', mode: 'insensitive' },
            categoria: CategoriaSoftware.LENGUAJE,
            activo: true,
          },
          skip: 10,
          take: 10,
        }),
      );
      expect(res.total).toBe(1);
      expect(res.items[0].uso).toEqual({ laboratorios: 2, secciones: 3 });
      expect(res.items[0]).not.toHaveProperty('_count');
    });
  });

  describe('crearSoftware y editarSoftware', () => {
    it('crea con el nombre normalizado y el autor del token', async () => {
      const db = {
        software: {
          create: jest.fn().mockResolvedValue(
            fila({
              nombre: 'Visual Studio Code',
              nombreNormalizado: 'visual studio code',
              version: '',
            }),
          ),
        },
      } as any;

      await crearSoftware(
        {
          nombre: 'Visual Studio Code',
          version: '',
          categoria: CategoriaSoftware.IDE,
          tipoLicencia: TipoLicencia.LIBRE,
        },
        auth,
        db,
      );

      expect(db.software.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Visual Studio Code',
            nombreNormalizado: 'visual studio code',
            creadoPorId: 'coord-1',
          }),
        }),
      );
    });

    it('409 si ya existe el mismo nombre y versión', async () => {
      const db = { software: { create: jest.fn().mockRejectedValue(conflictoUnico()) } } as any;

      await expect(
        crearSoftware(
          {
            nombre: 'Python',
            version: '3.12',
            categoria: CategoriaSoftware.LENGUAJE,
            tipoLicencia: TipoLicencia.LIBRE,
          },
          auth,
          db,
        ),
      ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('Python 3.12') });
    });

    it('editarSoftware responde 404 si no existe', async () => {
      const db = {
        software: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
      } as any;

      await expect(editarSoftware('nope', { nombre: 'X' }, db)).rejects.toMatchObject({
        status: 404,
      });
      expect(db.software.update).not.toHaveBeenCalled();
    });

    it('editarSoftware recalcula el nombre normalizado', async () => {
      const db = {
        software: {
          findUnique: jest.fn().mockResolvedValue(fila()),
          update: jest.fn().mockResolvedValue(fila({ nombre: 'Python 3' })),
        },
      } as any;

      // El saneado (trim) ocurre en el esquema Zod del controlador.
      await editarSoftware('sw-1', { nombre: 'Python 3' }, db);

      expect(db.software.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sw-1' },
          data: { nombre: 'Python 3', nombreNormalizado: 'python 3' },
        }),
      );
    });

    it('cambiarEstadoSoftware hace baja lógica sin borrar relaciones', async () => {
      const db = {
        software: {
          findUnique: jest.fn().mockResolvedValue(fila()),
          update: jest.fn().mockResolvedValue(fila({ activo: false })),
        },
      } as any;

      const res = await cambiarEstadoSoftware('sw-1', false, db);

      expect(db.software.update).toHaveBeenCalledWith({
        where: { id: 'sw-1' },
        data: { activo: false },
        include: expect.anything(),
      });
      expect(db.software.delete).toBeUndefined();
      expect(res.activo).toBe(false);
    });

    it('obtenerSoftwarePorId devuelve 404 con mensaje claro', async () => {
      const db = { software: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
      await expect(obtenerSoftwarePorId('sw-x', db)).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining('sw-x'),
      });
    });
  });

  describe('resolución contra el catálogo', () => {
    it('resolverSoftwarePorNombre separa nombre y versión antes de consultar', async () => {
      const db = { software: { findUnique: jest.fn().mockResolvedValue(null) } } as any;

      await resolverSoftwarePorNombre('  Python   3.12 ', undefined, db);

      expect(db.software.findUnique).toHaveBeenCalledWith({
        where: {
          nombreNormalizado_version: { nombreNormalizado: 'python', version: '3.12' },
        },
        select: { id: true, nombre: true, nombreNormalizado: true, version: true },
      });
    });

    it('resolverSoftwareIds deduplica y valida existencia y estado', async () => {
      const db = {
        software: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'a', nombre: 'A', nombreNormalizado: 'a', version: '', activo: true },
            { id: 'b', nombre: 'B', nombreNormalizado: 'b', version: '2', activo: true },
          ]),
        },
      } as any;

      const res = await resolverSoftwareIds(['a', 'b', 'a'], db);

      expect(db.software.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['a', 'b'] } } }),
      );
      expect(res.map((s) => s.id)).toEqual(['a', 'b']);
    });

    it('resolverSoftwareIds responde 404 si falta un id y 422 si está inactivo', async () => {
      const faltante = {
        software: { findMany: jest.fn().mockResolvedValue([]) },
      } as any;
      await expect(resolverSoftwareIds(['x'], faltante)).rejects.toMatchObject({ status: 404 });

      const inactivo = {
        software: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'x', nombre: 'X', nombreNormalizado: 'x', version: '', activo: false },
            ]),
        },
      } as any;
      await expect(resolverSoftwareIds(['x'], inactivo)).rejects.toMatchObject({
        status: 422,
        message: expect.stringContaining('dado de baja'),
      });
    });

    it('sembrarCatalogoSoftware es idempotente y devuelve el mapa texto → id', async () => {
      const db = {
        software: {
          upsert: jest.fn().mockImplementation(async ({ where }) => ({
            id: `sw-${where.nombreNormalizado_version.nombreNormalizado}`,
          })),
        },
      } as any;

      const mapa = await sembrarCatalogoSoftware(db, ['Python 3.12', ' Git ', 'Python 3.12', '']);

      expect([...mapa.keys()]).toEqual(['Git', 'Python 3.12']);
      expect(mapa.get('Python 3.12')).toBe('sw-python');
      expect(db.software.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
