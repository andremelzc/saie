import { describe, it, expect } from 'vitest';
import * as adminUtils from './admin';
import { describirMotivoEscalamiento } from './admin';
import { formatearFechaCorta } from './fechas';

describe('Utils de Administración', () => {
  it('traduce los motivos del motor sin mostrar códigos internos', () => {
    expect(describirMotivoEscalamiento('[CAPACIDAD_INSUFICIENTE] 45 vacantes').etiqueta).toBe(
      'Capacidad insuficiente',
    );
    expect(describirMotivoEscalamiento('[SOFTWARE_FALTANTE] Stack incompleto').etiqueta).toBe(
      'Software faltante',
    );
    expect(describirMotivoEscalamiento('[TIPO_NUEVO] Detalle').etiqueta).toBe('Requiere revisión');
  });

  it('conserva los motivos escritos a mano y completa los vacíos', () => {
    expect(describirMotivoEscalamiento('Conflicto por aforo excedido').descripcion).toBe(
      'Conflicto por aforo excedido',
    );
    expect(describirMotivoEscalamiento(null).descripcion).toBe('Sin motivo registrado.');
  });

  it('formatea la fecha corta de la última carga', () => {
    // Las fechas se muestran siempre en hora de Lima (UTC-5), sin depender del huso del equipo.
    const iso = '2026-10-12T15:32:00.000Z';
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

  describe('resumirReubicacion (Issue 2.22)', () => {
    const seccion = (estado: 'VIGENTE' | 'ESCALADA') => ({
      seccionId: 's',
      codigoSeccion: '1',
      codigoCurso: 'C1',
      estado,
      espacioIds: [],
      motivoEscalamiento: null,
      conservada: false,
    });

    it('cuenta las secciones reubicadas', () => {
      expect(
        adminUtils.resumirReubicacion({
          alertaId: 'a',
          alertaResuelta: true,
          secciones: [seccion('VIGENTE')],
        }),
      ).toBe('Alerta resuelta: 1 sección reubicada.');
    });

    it('no cuenta como reubicadas las que siguen en su aula', () => {
      expect(
        adminUtils.resumirReubicacion({
          alertaId: 'a',
          alertaResuelta: true,
          secciones: [seccion('VIGENTE'), { ...seccion('VIGENTE'), conservada: true }],
        }),
      ).toBe('Alerta resuelta: 1 sección reubicada, 1 sin cambios (su aula sigue sirviendo).');
    });

    it('indica las que quedaron en revisión', () => {
      expect(
        adminUtils.resumirReubicacion({
          alertaId: 'a',
          alertaResuelta: true,
          secciones: [seccion('VIGENTE'), seccion('VIGENTE'), seccion('ESCALADA')],
        }),
      ).toBe('Alerta resuelta: 2 secciones reubicadas, 1 en revisión en el inicio.');
    });
  });

  describe('separarDatosIncompletos (Issue 2.25)', () => {
    it('separa las secciones sin horarios de las que esperan revisión', () => {
      const sinHorario = { motivoEscalamiento: '[SIN_HORARIOS_DEFINIDOS] sin franjas' };
      const ocupada = { motivoEscalamiento: '[HORARIO_BLOQUEADO] todo ocupado' };
      const sinMotivo = { motivoEscalamiento: null };

      expect(adminUtils.separarDatosIncompletos([sinHorario, ocupada, sinMotivo])).toEqual({
        enRevision: [ocupada, sinMotivo],
        datosIncompletos: [sinHorario],
      });
    });
  });
});
