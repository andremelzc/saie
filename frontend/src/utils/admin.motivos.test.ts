import { describe, expect, it } from 'vitest';
import {
  accionSoftwareFaltante,
  codigoSeccionCompleto,
  describirMotivoEscalamiento,
  rotuloSeccion,
  softwareFaltanteDeMotivo,
} from './admin';

describe('softwareFaltanteDeMotivo', () => {
  it('extrae la lista de software del motivo de software faltante', () => {
    expect(
      softwareFaltanteDeMotivo(
        '[SOFTWARE_FALTANTE] Ningún laboratorio disponible en la franja horaria cuenta con el stack de software requerido: [MySQL, Python >=3.10].',
      ),
    ).toEqual(['MySQL', 'Python >=3.10']);
  });

  it('devuelve una lista vacía para otros motivos o sin lista', () => {
    expect(softwareFaltanteDeMotivo('[CAPACIDAD_INSUFICIENTE] Faltan 3 puestos [x].')).toEqual([]);
    expect(softwareFaltanteDeMotivo('[SOFTWARE_FALTANTE] Sin detalle.')).toEqual([]);
    expect(softwareFaltanteDeMotivo(null)).toEqual([]);
  });
});

describe('rótulos y acción de las secciones escaladas', () => {
  const seccion = {
    codigoCurso: '202SW0503',
    nombreCurso: 'BASE DE DATOS I',
    codigoSeccion: '2-LAB',
    tipoEspacioRequerido: 'LABORATORIO' as const,
  };

  it('rotula la sección como grupo y tipo, con el código aparte', () => {
    expect(rotuloSeccion(seccion)).toBe('BASE DE DATOS I · Grupo 2 · Laboratorio');
    expect(codigoSeccionCompleto(seccion)).toBe('202SW0503 · 2-LAB');
  });

  it('arma la acción de software faltante con horarios y alumnos', () => {
    expect(
      accionSoftwareFaltante({
        motivoEscalamiento: '[SOFTWARE_FALTANTE] … requerido: [MySQL, Docker].',
        seccion: {
          alumnosMatriculados: 1,
          horarios: [
            { diaSemana: 'LUNES', horaInicio: '17:00', horaFin: '19:00' },
            { diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '10:00' },
          ],
        },
      }),
    ).toBe(
      'Falta MySQL y Docker. Pide a Jefatura que los instale en un laboratorio libre el lunes 17:00–19:00 y el miércoles 08:00–10:00 (1 alumno) y luego pulsa Reintentar.',
    );
    expect(
      accionSoftwareFaltante({
        motivoEscalamiento: '[SOFTWARE_FALTANTE] Sin lista.',
        seccion: { alumnosMatriculados: 3 },
      }),
    ).toBe(
      'Falta el software que pide la sección. Pide a Jefatura que lo instale en un laboratorio libre a la hora de la sección (3 alumnos) y luego pulsa Reintentar.',
    );
    expect(
      accionSoftwareFaltante({
        motivoEscalamiento: '[CAPACIDAD_INSUFICIENTE] x',
        seccion: { alumnosMatriculados: 3 },
      }),
    ).toBeNull();
  });
});

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
    expect(motivo.etiqueta).toBe('Requiere revisión');
    expect(motivo.descripcion).toBe('Texto libre');
    expect(motivo.accion).toBeNull();
  });

  it('maneja un motivo vacío', () => {
    const motivo = describirMotivoEscalamiento(null);

    expect(motivo.codigo).toBeNull();
    expect(motivo.descripcion).toBe('Sin motivo registrado.');
  });
});
