import { describe, expect, it } from 'vitest';
import { candidatasLaboratorio, textoFranjas, tienePendiente } from './fusionLaboratorio';
import type { HorarioSemanalDTO, SesionDTO } from '../types/horario';
import { solicitudLaboratorio } from '../test/fixtures/fusionLaboratorio';

const sesion = (o: Partial<SesionDTO>): SesionDTO => ({
  seccionId: 'sec-teo',
  codigoCurso: '202SW0805',
  nombreCurso: 'GC',
  codigoSeccion: '2',
  tipoEspacioRequerido: 'AULA_TEORICA',
  docenteNombre: null,
  diaSemana: 'JUEVES',
  horaInicio: '18:00',
  horaFin: '20:00',
  espacios: [],
  estadoAsignacion: 'VIGENTE',
  ...o,
});

describe('fusionLaboratorio (Issue 7.17)', () => {
  it('candidatas: teoría con laboratorio en el mismo grupo, con sus franjas ordenadas', () => {
    const horario: HorarioSemanalDTO = {
      periodo: '2026-2',
      vista: 'semana',
      dias: {
        MARTES: [sesion({ diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' })],
        JUEVES: [
          sesion({}),
          sesion({
            seccionId: 'sec-lab',
            codigoSeccion: '2-LAB',
            tipoEspacioRequerido: 'LABORATORIO',
            horaInicio: '20:00',
            horaFin: '22:00',
          }),
          sesion({ seccionId: 'sec-3', codigoSeccion: '3' }),
        ],
      },
    };
    expect(candidatasLaboratorio(horario)).toEqual([
      {
        seccionTeoriaId: 'sec-teo',
        codigoCurso: '202SW0805',
        nombreCurso: 'GC',
        grupo: '2',
        franjasTeoria: [
          { diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' },
          { diaSemana: 'JUEVES', horaInicio: '18:00', horaFin: '20:00' },
        ],
        franjasLaboratorio: [{ diaSemana: 'JUEVES', horaInicio: '20:00', horaFin: '22:00' }],
      },
    ]);
  });

  it('textoFranjas ordena por día y hora', () => {
    expect(
      textoFranjas([
        { diaSemana: 'JUEVES', horaInicio: '20:00', horaFin: '22:00' },
        { diaSemana: 'LUNES', horaInicio: '08:00:00', horaFin: '10:00:00' },
      ]),
    ).toBe('Lunes 08:00 – 10:00, Jueves 20:00 – 22:00');
    expect(textoFranjas([])).toBe('sin horario');
  });

  it('tienePendiente solo cuenta las pendientes de esa teoría', () => {
    const lista = [solicitudLaboratorio(), solicitudLaboratorio({ id: 'x', estado: 'RECHAZADA' })];
    expect(tienePendiente('sec-teo', lista)).toBe(true);
    expect(tienePendiente('sec-teo', [lista[1]])).toBe(false);
    expect(tienePendiente('otra', lista)).toBe(false);
  });
});
