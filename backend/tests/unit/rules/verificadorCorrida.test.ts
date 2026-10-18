import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import {
  AsignacionVerificable,
  REGLAS_VERIFICACION,
  ReglaVerificacion,
  ResultadoVerificacion,
  verificarCorrida,
} from '../../../src/rules/verificadorCorrida';

function espacio(id: string, opciones: Partial<EspacioConexo> = {}): EspacioConexo {
  return {
    id,
    identificador: `Espacio ${id}`,
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'A',
    piso: 1,
    aforoNominal: 40,
    pcsMalogradas: 0,
    softwareInstalado: [],
    ...opciones,
  };
}

function asignacion(overrides: Partial<AsignacionVerificable> = {}): AsignacionVerificable {
  return {
    id: 'asig-1',
    seccionId: 's1',
    codigoSeccion: '1',
    estado: EstadoAsignacion.VIGENTE,
    espacioIds: ['e1'],
    motivoEscalamiento: null,
    alumnosMatriculados: 10,
    tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
    stackSoftwareRequerido: [],
    horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
    ...overrides,
  };
}

function vecinos(adyacencias: Record<string, string[]>) {
  return (id: string): string[] => adyacencias[id] ?? [];
}

function regla(resultado: ResultadoVerificacion, nombre: ReglaVerificacion) {
  const encontrada = resultado.reglas.find((r) => r.regla === nombre);
  if (!encontrada) {
    throw new Error(`Regla ${nombre} no encontrada`);
  }
  return encontrada;
}

describe('Issue 2.17 - Verificador posterior a la corrida (regla pura)', () => {
  describe('Primera regla, doble reserva', () => {
    it('marca un mismo espacio con horarios solapados en dos asignaciones vigentes', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({ id: 'a1', seccionId: 's1', codigoSeccion: '1', espacioIds: ['e1'] }),
          asignacion({
            id: 'a2',
            seccionId: 's2',
            codigoSeccion: '2',
            espacioIds: ['e1'],
            horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '11:00' }],
          }),
        ],
        espacios: [espacio('e1')],
        obtenerVecinosContiguos: vecinos({}),
      });

      const dobleReserva = regla(resultado, REGLAS_VERIFICACION.DOBLE_RESERVA);
      expect(dobleReserva.revisadas).toBe(2);
      expect(dobleReserva.violaciones).toHaveLength(2);
      expect(dobleReserva.violaciones[0].detalle).toContain('e1');
      expect(resultado.conforme).toBe(false);
    });

    it('no marca doble reserva si los horarios no se solapan', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({ id: 'a1', seccionId: 's1', espacioIds: ['e1'] }),
          asignacion({
            id: 'a2',
            seccionId: 's2',
            espacioIds: ['e1'],
            horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '10:00', horaFin: '12:00' }],
          }),
        ],
        espacios: [espacio('e1')],
        obtenerVecinosContiguos: vecinos({}),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.DOBLE_RESERVA).violaciones).toHaveLength(0);
      expect(resultado.conforme).toBe(true);
    });

    it('no marca doble reserva entre dos asignaciones de la misma sección', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({ id: 'a1', seccionId: 's1', espacioIds: ['e1'] }),
          asignacion({ id: 'a2', seccionId: 's1', espacioIds: ['e1'] }),
        ],
        espacios: [espacio('e1')],
        obtenerVecinosContiguos: vecinos({}),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.DOBLE_RESERVA).violaciones).toHaveLength(0);
      expect(
        regla(resultado, REGLAS_VERIFICACION.UNA_VIGENTE_POR_SECCION).violaciones,
      ).toHaveLength(2);
    });
  });

  describe('Capacidad real suficiente', () => {
    it('marca la asignación cuando la capacidad real del bloque no cubre a los matriculados', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({
            alumnosMatriculados: 20,
            tipoEspacioRequerido: TipoEspacio.LABORATORIO,
            espacioIds: ['e1'],
          }),
        ],
        espacios: [
          espacio('e1', {
            tipo: TipoEspacio.LABORATORIO,
            aforoNominal: 20,
            pcsMalogradas: 5,
          }),
        ],
        obtenerVecinosContiguos: vecinos({}),
      });

      const capacidad = regla(resultado, REGLAS_VERIFICACION.CAPACIDAD_SUFICIENTE);
      expect(capacidad.violaciones).toHaveLength(1);
      expect(capacidad.violaciones[0].detalle).toContain('15');
    });

    it('suma la capacidad de todos los espacios del bloque', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ alumnosMatriculados: 60, espacioIds: ['e1', 'e2'] })],
        espacios: [espacio('e1'), espacio('e2')],
        obtenerVecinosContiguos: vecinos({ e1: ['e2'], e2: ['e1'] }),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.CAPACIDAD_SUFICIENTE).violaciones).toHaveLength(
        0,
      );
    });
  });

  describe('Tipo de espacio homogéneo', () => {
    it('marca un bloque que mezcla tipos de espacio', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ espacioIds: ['e1', 'e2'] })],
        espacios: [espacio('e1'), espacio('e2', { tipo: TipoEspacio.LABORATORIO })],
        obtenerVecinosContiguos: vecinos({ e1: ['e2'], e2: ['e1'] }),
      });

      const tipo = regla(resultado, REGLAS_VERIFICACION.TIPO_HOMOGENEO);
      expect(tipo.violaciones).toHaveLength(1);
      expect(tipo.violaciones[0].detalle).toContain('mezcla');
    });

    it('marca un bloque homogéneo que no coincide con el tipo requerido', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({ espacioIds: ['e1'], tipoEspacioRequerido: TipoEspacio.LABORATORIO }),
        ],
        espacios: [espacio('e1')],
        obtenerVecinosContiguos: vecinos({}),
      });

      const tipo = regla(resultado, REGLAS_VERIFICACION.TIPO_HOMOGENEO);
      expect(tipo.violaciones).toHaveLength(1);
      expect(tipo.violaciones[0].detalle).toContain('requiere LABORATORIO');
    });
  });

  describe('Bloque contiguo', () => {
    it('marca un bloque con espacios no alcanzables por vecindad', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ espacioIds: ['e1', 'e2'] })],
        espacios: [espacio('e1'), espacio('e2')],
        obtenerVecinosContiguos: vecinos({}),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.BLOQUE_CONTIGUO).violaciones).toHaveLength(1);
    });

    it('marca como no contiguo un bloque que cruza de piso', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ espacioIds: ['e1', 'e2'] })],
        espacios: [espacio('e1'), espacio('e2', { piso: 2 })],
        obtenerVecinosContiguos: vecinos({ e1: ['e2'], e2: ['e1'] }),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.BLOQUE_CONTIGUO).violaciones).toHaveLength(1);
    });

    it('acepta un bloque conexo del mismo piso y pabellón', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ espacioIds: ['e1', 'e2'] })],
        espacios: [espacio('e1'), espacio('e2')],
        obtenerVecinosContiguos: vecinos({ e1: ['e2'], e2: ['e1'] }),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.BLOQUE_CONTIGUO).violaciones).toHaveLength(0);
    });
  });

  describe('Stack de software en laboratorios', () => {
    it('marca el laboratorio al que le falta software requerido', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({
            tipoEspacioRequerido: TipoEspacio.LABORATORIO,
            espacioIds: ['e1'],
            stackSoftwareRequerido: ['Python 3.12', 'Java 17'],
          }),
        ],
        espacios: [
          espacio('e1', { tipo: TipoEspacio.LABORATORIO, softwareInstalado: ['Python 3.12'] }),
        ],
        obtenerVecinosContiguos: vecinos({}),
      });

      const software = regla(resultado, REGLAS_VERIFICACION.SOFTWARE_COMPLETO);
      expect(software.revisadas).toBe(1);
      expect(software.violaciones).toHaveLength(1);
      expect(software.violaciones[0].detalle).toContain('Java 17');
    });

    it('acepta un laboratorio con todo el software y no evalúa aulas teóricas', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({
            id: 'lab',
            tipoEspacioRequerido: TipoEspacio.LABORATORIO,
            espacioIds: ['e1'],
            stackSoftwareRequerido: ['Python 3.12'],
          }),
          asignacion({ id: 'aula', seccionId: 's2', espacioIds: ['e2'] }),
        ],
        espacios: [
          espacio('e1', { tipo: TipoEspacio.LABORATORIO, softwareInstalado: ['Python 3.12'] }),
          espacio('e2'),
        ],
        obtenerVecinosContiguos: vecinos({}),
      });

      const software = regla(resultado, REGLAS_VERIFICACION.SOFTWARE_COMPLETO);
      expect(software.revisadas).toBe(1);
      expect(software.violaciones).toHaveLength(0);
    });
  });

  describe('Secciones escaladas', () => {
    it('marca una sección escalada sin motivo', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({
            estado: EstadoAsignacion.ESCALADA,
            espacioIds: [],
            motivoEscalamiento: '   ',
          }),
        ],
        espacios: [],
        obtenerVecinosContiguos: vecinos({}),
      });

      const escalada = regla(resultado, REGLAS_VERIFICACION.ESCALADA_CON_MOTIVO);
      expect(escalada.revisadas).toBe(1);
      expect(escalada.violaciones).toHaveLength(1);
    });

    it('acepta una sección escalada con motivo', () => {
      const resultado = verificarCorrida({
        asignaciones: [
          asignacion({
            estado: EstadoAsignacion.ESCALADA,
            espacioIds: [],
            motivoEscalamiento: 'CAPACIDAD_INSUFICIENTE: faltan 10',
          }),
        ],
        espacios: [],
        obtenerVecinosContiguos: vecinos({}),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.ESCALADA_CON_MOTIVO).violaciones).toHaveLength(0);
      expect(resultado.conforme).toBe(true);
    });
  });

  describe('Reglas que no aplican y estados ignorados', () => {
    it('ignora por completo las asignaciones HISTORICA', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ estado: EstadoAsignacion.HISTORICA, espacioIds: [] })],
        espacios: [],
        obtenerVecinosContiguos: vecinos({}),
      });

      expect(resultado.totalRevisadas).toBe(0);
      expect(resultado.conforme).toBe(true);
    });

    it('acepta una corrida conforme y resume cada regla', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ espacioIds: ['e1', 'e2'], alumnosMatriculados: 50 })],
        espacios: [espacio('e1'), espacio('e2')],
        obtenerVecinosContiguos: vecinos({ e1: ['e2'], e2: ['e1'] }),
      });

      expect(resultado.conforme).toBe(true);
      expect(resultado.totalRevisadas).toBe(1);
      expect(resultado.totalViolaciones).toBe(0);
      expect(regla(resultado, REGLAS_VERIFICACION.DOBLE_RESERVA)).toMatchObject({
        revisadas: 1,
        cumplen: 1,
      });
      expect(regla(resultado, REGLAS_VERIFICACION.CAPACIDAD_SUFICIENTE)).toMatchObject({
        revisadas: 1,
        cumplen: 1,
      });
      expect(regla(resultado, REGLAS_VERIFICACION.UNA_VIGENTE_POR_SECCION)).toMatchObject({
        revisadas: 1,
        cumplen: 1,
      });
    });

    it('marca la asignación vigente que no tiene espacios', () => {
      const resultado = verificarCorrida({
        asignaciones: [asignacion({ espacioIds: [] })],
        espacios: [],
        obtenerVecinosContiguos: vecinos({}),
      });

      expect(regla(resultado, REGLAS_VERIFICACION.TIPO_HOMOGENEO).violaciones[0].detalle).toContain(
        'no tiene espacios',
      );
    });
  });
});
