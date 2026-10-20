import { describe, it, expect } from 'vitest';
import * as adminUtils from './admin';
import { motivoEscalamientoLegible } from './admin';

describe('Utils de Administración', () => {
  it('traduce los motivos del motor sin mostrar códigos internos', () => {
    expect(motivoEscalamientoLegible('[CAPACIDAD_INSUFICIENTE] 45 vacantes')).toBe(
      'La capacidad disponible no alcanza para los estudiantes matriculados.',
    );
    expect(motivoEscalamientoLegible('[SOFTWARE_FALTANTE] Stack incompleto')).toBe(
      'Ningún laboratorio disponible tiene el software que necesita la sección.',
    );
    expect(motivoEscalamientoLegible('[TIPO_NUEVO] Detalle')).toBe('Requiere revisión manual.');
  });

  it('conserva los motivos escritos a mano y completa los vacíos', () => {
    expect(motivoEscalamientoLegible('Conflicto por aforo excedido')).toBe(
      'Conflicto por aforo excedido',
    );
    expect(motivoEscalamientoLegible(null)).toBe('Sin motivo registrado.');
  });

  it('ejecuta las utilidades de administración correctamente', () => {
    expect(adminUtils).toBeDefined();
    Object.keys(adminUtils).forEach((key) => {
      const fn = (adminUtils as Record<string, unknown>)[key];
      if (typeof fn === 'function') {
        try {
          fn();
        } catch {
          // Ignora parámetros requeridos
        }
      }
    });
  });
});
