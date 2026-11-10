import { describe, expect, it } from 'vitest';
import type { RegistroAuditoriaDTO } from '../types/admin';
import {
  fraseDeMotivoAlerta,
  fraseDeRegistro,
  fraseDeViolacion,
  indexarEspacios,
  nombrarEspacios,
  sinIdentificadores,
} from './textoMotor';

const A1 = '6f1c2a3b-4d5e-4f60-8a71-9b8c7d6e5f40';
const A2 = '7f1c2a3b-4d5e-4f60-8a71-9b8c7d6e5f41';
const CORRIDA = '11111111-2222-4333-8444-555555555555';
const espacios = indexarEspacios([
  { id: A1, identificador: 'Aula 102', pabellon: 'C', piso: 3 },
  { id: A2, identificador: 'Aula 103', pabellon: 'C', piso: 3 },
]);

const registro = (
  detalle: string,
  o: Partial<RegistroAuditoriaDTO> = {},
): RegistroAuditoriaDTO => ({
  id: 'r1',
  tipoEvento: 'ASIGNACION',
  detalle,
  fechaHora: '2026-10-12T15:32:00Z',
  asignacionId: 'a1',
  alertaId: null,
  seccion: { id: 's1', codigoCurso: 'CC-101', codigoSeccion: '1', nombreCurso: 'Intro' },
  ...o,
});

const SIN_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-/i;

describe('frases del motor (Issue 4.49)', () => {
  it('nombra los espacios y agrupa la ubicación cuando la comparten', () => {
    expect(nombrarEspacios([A1], espacios)).toBe('Aula 102 (Pabellón C, piso 3)');
    expect(nombrarEspacios([A1, A2], espacios)).toBe('Aula 102 y Aula 103 (Pabellón C, piso 3)');
    expect(nombrarEspacios(['00000000-0000-4000-8000-000000000000'], espacios)).toBe('un espacio');
  });

  it('lee la asignación individual y la de una corrida', () => {
    expect(
      fraseDeRegistro(
        registro(`Asignación automática exitosa a espacios: [${A1}] (Puntaje cercanía: 3)`),
        espacios,
      ).frase,
    ).toBe('CC-101 · 1 pasó a Aula 102 (Pabellón C, piso 3)');

    const enCorrida = fraseDeRegistro(
      registro(`[Origen: MANUAL] Corrida Batch [${CORRIDA}] - Asignada a: [${A1}, ${A2}]`),
      espacios,
    );
    expect(enCorrida.frase).toBe('CC-101 · 1 pasó a Aula 102 y Aula 103 (Pabellón C, piso 3)');
    expect(enCorrida.contexto).toMatch(/^Asignación automática del /);
    expect(enCorrida.tecnico).toContain(CORRIDA);
  });

  it('lee las escaladas con su motivo en lenguaje llano', () => {
    const { frase } = fraseDeRegistro(
      registro(
        `[Origen: MANUAL] Corrida Batch [${CORRIDA}] - Escalada: [SIN_HORARIO] No tiene horario`,
        {
          tipoEvento: 'ESCALAMIENTO',
        },
      ),
      espacios,
    );
    expect(frase).toMatch(/^CC-101 · 1 pasó a revisión\. .+: No tiene horario$/);
  });

  it('lee el veredicto del verificador sin códigos de regla', () => {
    const conforme = fraseDeRegistro(
      registro(
        `Verificación conforme (corrida ${CORRIDA}): 8 asignaciones revisadas sin violaciones.`,
        {
          tipoEvento: 'VERIFICACION',
          seccion: null,
        },
      ),
      espacios,
    );
    expect(conforme.frase).toBe(
      'Comprobación correcta: 8 asignaciones revisadas, sin incumplimientos',
    );

    const noConforme = fraseDeRegistro(
      registro(`Verificación con 2 violación(es) (corrida ${CORRIDA}): CAPACIDAD_SUFICIENTE (2).`, {
        tipoEvento: 'VERIFICACION',
        seccion: null,
      }),
      espacios,
    );
    expect(noConforme.frase).toMatch(/^Comprobación con 2 incumplimientos: .+ \(2\)$/);
    expect(noConforme.frase).not.toMatch(/[A-Z]{3,}_/);
  });

  it('no deja UUID en un texto desconocido', () => {
    const { frase } = fraseDeRegistro(registro(`Algo pasó con ${A1} y ${CORRIDA}`), espacios);
    expect(frase).not.toMatch(SIN_UUID);
    expect(frase).toContain('Aula 102');
    expect(sinIdentificadores(`x [${A1}]`, espacios)).toBe('x Aula 102 (Pabellón C, piso 3)');
  });

  it('reescribe las violaciones y los motivos de alerta', () => {
    expect(
      fraseDeViolacion(
        `Comparte el espacio [${A1}] con la sección 2 en horarios solapados.`,
        espacios,
      ),
    ).toBe('Comparte Aula 102 (Pabellón C, piso 3) con la sección 2 a la misma hora.');
    expect(fraseDeViolacion('Capacidad real 30 < 35 matriculados.', espacios)).toBe(
      'El espacio admite 30 personas y hay 35 matriculados.',
    );
    expect(fraseDeMotivoAlerta('Capacidad real del bloque 30 < 35 alumnos matriculados')).toBe(
      'Caben 30 personas y hay 35 alumnos matriculados.',
    );
    expect(fraseDeMotivoAlerta('Lab 04 no tiene instalado: Docker 24')).toBe(
      'Falta instalar en Lab 04: Docker 24.',
    );
  });
});
