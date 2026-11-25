/**
 * auditoriaAcciones.test.ts — Issues #426 (4.63) y relacionados
 *
 * Verifica el módulo `auditoriaAcciones.service.ts`:
 *   - calcularCambios: solo registra campos cuyo valor realmente cambió (escalares, listas y nulls)
 *   - describirCambios: produce texto legible «campo: anterior → nuevo»
 *   - registrarAccionDePersona: llama a Prisma cuando hay cambios, retorna false si no los hay
 *
 * Issue 4.63 (R43): Las acciones de persona (restablecimiento de clave, altas, solicitudes,
 * incidencias, catálogo) deben registrarse con el mismo mecanismo que ya usan espacios y secciones.
 */

import {
  calcularCambios,
  describirCambios,
  registrarAccionDePersona,
  type CamposAuditados,
  type AccionDePersona,
} from '../../../src/services/auditoriaAcciones.service';
import { TipoEventoAuditoria } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbMock() {
  return {
    registroAuditoria: {
      create: jest.fn().mockResolvedValue({ id: 'reg-1' }),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite: calcularCambios
// ---------------------------------------------------------------------------

describe('calcularCambios (Issue 4.63 / R43)', () => {
  it('devuelve solo los campos cuyos valores cambiaron', () => {
    const campos: CamposAuditados = {
      nombre: { anterior: 'Sala A', nuevo: 'Sala B' },
      piso: { anterior: 1, nuevo: 1 },
      activo: { anterior: true, nuevo: false },
    };
    const resultado = calcularCambios(campos);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((c) => c.campo)).toContain('nombre');
    expect(resultado.map((c) => c.campo)).toContain('activo');
    expect(resultado.map((c) => c.campo)).not.toContain('piso');
  });

  it('considera iguales dos listas con los mismos elementos en distinto orden', () => {
    const campos: CamposAuditados = {
      software: { anterior: ['Python', 'Docker'], nuevo: ['Docker', 'Python'] },
    };
    expect(calcularCambios(campos)).toHaveLength(0);
  });

  it('detecta cambio en lista cuando se agrega o quita un elemento', () => {
    const campos: CamposAuditados = {
      software: { anterior: ['Python'], nuevo: ['Python', 'Docker'] },
    };
    const resultado = calcularCambios(campos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].campo).toBe('software');
    expect(resultado[0].nuevo).toContain('Docker');
  });

  it('detecta cambio de null a valor y viceversa', () => {
    const campos: CamposAuditados = {
      descripcion: { anterior: null, nuevo: 'Texto nuevo' },
      sede: { anterior: 'Pab A', nuevo: null },
    };
    const resultado = calcularCambios(campos);
    expect(resultado).toHaveLength(2);
  });

  it('devuelve lista vacía si ningún campo cambió', () => {
    const campos: CamposAuditados = {
      piso: { anterior: 2, nuevo: 2 },
      activo: { anterior: false, nuevo: false },
    };
    expect(calcularCambios(campos)).toHaveLength(0);
  });

  it('devuelve lista vacía si no hay campos auditados', () => {
    expect(calcularCambios({})).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite: describirCambios
// ---------------------------------------------------------------------------

describe('describirCambios (Issue 4.63 / R43)', () => {
  it('produce el formato «campo: anterior → nuevo» para escalares', () => {
    const cambios = calcularCambios({
      piso: { anterior: 1, nuevo: 2 },
      activo: { anterior: true, nuevo: false },
    });
    const texto = describirCambios(cambios);
    expect(texto).toContain('piso: 1 → 2');
    expect(texto).toContain('activo: true → false');
  });

  it('muestra «—» para valores null y listas vacías como «(ninguno)»', () => {
    const cambios = calcularCambios({
      descripcion: { anterior: null, nuevo: 'Algo' },
      software: { anterior: [], nuevo: ['Docker'] },
    });
    const texto = describirCambios(cambios);
    expect(texto).toContain('— →');
    expect(texto).toContain('(ninguno) →');
  });

  it('separa varios campos con punto y coma', () => {
    const cambios = calcularCambios({
      piso: { anterior: 1, nuevo: 3 },
      nombre: { anterior: 'A', nuevo: 'B' },
    });
    const texto = describirCambios(cambios);
    expect(texto).toContain(';');
  });

  it('devuelve cadena vacía si no hay cambios', () => {
    expect(describirCambios([])).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Suite: registrarAccionDePersona
// ---------------------------------------------------------------------------

describe('registrarAccionDePersona (Issue 4.63 / R43)', () => {
  beforeEach(() => jest.clearAllMocks());

  const accionBase: AccionDePersona = {
    tipoEvento: 'EDICION_ESPACIO',
    cuentaId: 'cuenta-coord',
    descripcion: 'Espacio A-101 editado',
    cambios: [{ campo: 'piso', anterior: 1, nuevo: 2 }],
    espacioId: 'espacio-1',
  };

  it('crea un registro de auditoría cuando hay cambios', async () => {
    const db = dbMock();
    const resultado = await registrarAccionDePersona(db as any, accionBase);

    expect(resultado).toBe(true);
    expect(db.registroAuditoria.create).toHaveBeenCalledTimes(1);
    const datos = db.registroAuditoria.create.mock.calls[0][0].data;
    expect(datos.tipoEvento).toBe(TipoEventoAuditoria.EDICION_ESPACIO);
    expect(datos.cuentaId).toBe('cuenta-coord');
    expect(datos.espaciosIds).toContain('espacio-1');
    expect(datos.detalle).toContain('Espacio A-101 editado');
    expect(datos.detalle).toContain('piso');
  });

  it('retorna false y no llama a Prisma si no hay cambios', async () => {
    const db = dbMock();
    const accionSinCambios: AccionDePersona = { ...accionBase, cambios: [] };

    const resultado = await registrarAccionDePersona(db as any, accionSinCambios);

    expect(resultado).toBe(false);
    expect(db.registroAuditoria.create).not.toHaveBeenCalled();
  });

  it('registra una edición de sección con seccionId en la fila de auditoría', async () => {
    const db = dbMock();
    const accionSeccion: AccionDePersona = {
      tipoEvento: 'EDICION_SECCION',
      cuentaId: 'cuenta-jef',
      descripcion: 'Sección CC-101-A editada',
      cambios: [{ campo: 'activo', anterior: true, nuevo: false }],
      seccionId: 'seccion-5',
    };

    await registrarAccionDePersona(db as any, accionSeccion);

    const datos = db.registroAuditoria.create.mock.calls[0][0].data;
    expect(datos.tipoEvento).toBe(TipoEventoAuditoria.EDICION_SECCION);
    expect(datos.seccionId).toBe('seccion-5');
    expect(datos.espaciosIds).toEqual([]);
  });

  it('registra un cambio de laboratorio con espacioId correcto', async () => {
    const db = dbMock();
    const accionLab: AccionDePersona = {
      tipoEvento: 'CAMBIO_LABORATORIO',
      cuentaId: 'cuenta-jef',
      descripcion: 'Lab B-205 editado',
      cambios: [
        {
          campo: 'softwareInstalado',
          anterior: ['Python'],
          nuevo: ['Python', 'MATLAB'],
        },
      ],
      espacioId: 'lab-205',
    };

    await registrarAccionDePersona(db as any, accionLab);

    const datos = db.registroAuditoria.create.mock.calls[0][0].data;
    expect(datos.tipoEvento).toBe(TipoEventoAuditoria.CAMBIO_LABORATORIO);
    expect(datos.espaciosIds).toContain('lab-205');
    expect(datos.detalle).toContain('softwareInstalado');
  });

  it('el detalle contiene tanto la descripción como los cambios formateados', async () => {
    const db = dbMock();
    await registrarAccionDePersona(db as any, accionBase);

    const datos = db.registroAuditoria.create.mock.calls[0][0].data;
    // El detalle debe contener descripción y los cambios: «Espacio A-101 editado: piso: 1 → 2»
    expect(datos.detalle).toMatch(/Espacio A-101 editado.+piso.+1.+2/);
  });
});
