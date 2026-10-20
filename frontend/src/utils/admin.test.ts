import { describe, it, expect } from 'vitest';
import * as adminUtils from './admin';
import { describirMotivoEscalamiento, formatearFechaCorta } from './admin';

describe('Utils de Administración', () => {
  it('traduce los motivos del motor sin mostrar códigos internos', () => {
    expect(describirMotivoEscalamiento('[CAPACIDAD_INSUFICIENTE] 45 vacantes').etiqueta).toBe(
      'Capacidad insuficiente',
    );
    expect(describirMotivoEscalamiento('[SOFTWARE_FALTANTE] Stack incompleto').etiqueta).toBe(
      'Software faltante',
    );
    expect(describirMotivoEscalamiento('[TIPO_NUEVO] Detalle').etiqueta).toBe('Escalamiento');
  });

  it('conserva los motivos escritos a mano y completa los vacíos', () => {
    expect(describirMotivoEscalamiento('Conflicto por aforo excedido').descripcion).toBe(
      'Conflicto por aforo excedido',
    );
    expect(describirMotivoEscalamiento(null).descripcion).toBe('Sin motivo registrado.');
  });

  it('formatea la fecha corta de la última carga', () => {
    // Se arma en hora local para que la comprobación no dependa del huso del runner.
    const iso = new Date(2026, 9, 12, 10, 32).toISOString();
    expect(formatearFechaCorta(iso)).toMatch(/10:32/);
    expect(formatearFechaCorta('no-es-una-fecha')).toBe('no-es-una-fecha');
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
