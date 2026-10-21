import { describe, expect, it } from 'vitest';
import { describirMotivoEscalamiento } from './admin';

describe('describirMotivoEscalamiento', () => {
  it('separa el código, traduce la etiqueta y sugiere cargar el horario', () => {
    const motivo = describirMotivoEscalamiento(
      '[SIN_HORARIOS_DEFINIDOS] La sección DEMO no cuenta con franjas horarias registradas para el periodo 2026-2.',
    );

    expect(motivo).toMatchObject({
      codigo: 'SIN_HORARIOS_DEFINIDOS',
      etiqueta: 'Sin horarios definidos',
      descripcion:
        'La sección DEMO no cuenta con franjas horarias registradas para el periodo 2026-2.',
      accion: { etiqueta: 'Cargar horario', to: '/admin/carga#carga-horarios' },
    });
  });

  it('mantiene la descripción de un motivo desconocido y no inventa una acción', () => {
    const motivo = describirMotivoEscalamiento('Texto libre');

    expect(motivo.codigo).toBeNull();
    expect(motivo.etiqueta).toBe('Motivo sin clasificar');
    expect(motivo.descripcion).toBe('Texto libre');
    expect(motivo.accion).toBeNull();
  });

  it('maneja un motivo vacío', () => {
    const motivo = describirMotivoEscalamiento(null);

    expect(motivo.codigo).toBeNull();
    expect(motivo.descripcion).toBe('Sin motivo registrado.');
  });
});
