import { TipoEspacio } from '@prisma/client';
import {
  validarSoftwareLaboratorio,
  validarSoftwareBloque,
  normalizarNombreSoftware,
} from '../../../src/rules/validarSoftware';
import { BloqueCandidato, EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';

// ---------------------------------------------------------------------------
// Fixtures compartidos
// ---------------------------------------------------------------------------

const lab1: EspacioConexo = {
  id: 'lab-1',
  identificador: 'Lab 101',
  tipo: TipoEspacio.LABORATORIO,
  pabellon: 'Pab A',
  piso: 1,
  aforoNominal: 30,
  softwareInstalado: ['VS Code', 'Node.js', 'PostgreSQL'],
};

const lab2: EspacioConexo = {
  id: 'lab-2',
  identificador: 'Lab 102',
  tipo: TipoEspacio.LABORATORIO,
  pabellon: 'Pab A',
  piso: 1,
  aforoNominal: 30,
  softwareInstalado: ['VS Code', 'Node.js'], // No tiene PostgreSQL
};

const aula1: EspacioConexo = {
  id: 'aula-1',
  identificador: 'Aula 101',
  tipo: TipoEspacio.AULA_TEORICA,
  pabellon: 'Pab A',
  piso: 1,
  aforoNominal: 40,
};

// ---------------------------------------------------------------------------
// Helper para construir un BloqueCandidato de laboratorio
// ---------------------------------------------------------------------------
function crearBloqueLabConEspacios(espacios: EspacioConexo[]): BloqueCandidato {
  return {
    espacios,
    espacioIds: espacios.map((e) => e.id),
    capacidadTotal: espacios.reduce((s, e) => s + e.aforoNominal, 0),
    desperdicio: 0,
    piso: 1,
    pabellon: 'Pab A',
    tipo: TipoEspacio.LABORATORIO,
  };
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------

describe('Issue 2.6, 2.7 / 5.5 — Pruebas parametrizadas de validación de software (laboratorio individual y bloque)', () => {
  // -------------------------------------------------------------------------
  // Issue 2.6: validarSoftwareLaboratorio — casos básicos
  // -------------------------------------------------------------------------
  describe('Issue 2.6: validarSoftwareLaboratorio — funcionalidad básica', () => {
    test('normalización de nombres de software es insensible a mayúsculas y espacios extra', () => {
      expect(normalizarNombreSoftware('  Python  3.12  ')).toBe('python 3.12');
      expect(normalizarNombreSoftware('VS Code')).toBe('vs code');
    });

    test('cumple si el stack requerido está vacío o es nulo', () => {
      const instalado = ['VS Code', 'Node.js'];

      expect(validarSoftwareLaboratorio(instalado, [])).toEqual({
        cumple: true,
        softwareFaltante: [],
      });
      expect(validarSoftwareLaboratorio(instalado, null)).toEqual({
        cumple: true,
        softwareFaltante: [],
      });
    });

    test('cumple cuando el laboratorio tiene todo el software requerido con normalización', () => {
      const instalado = ['Visual Studio Code ', 'PYTHON 3.12', 'docker'];
      const requerido = ['visual studio code', 'Python 3.12', 'Docker'];

      const resultado = validarSoftwareLaboratorio(instalado, requerido);
      expect(resultado.cumple).toBe(true);
      expect(resultado.softwareFaltante).toHaveLength(0);
    });

    test('no cumple y retorna la lista de software faltante si carece de algún programa', () => {
      const instalado = ['VS Code', 'Node.js'];
      const requerido = ['VS Code', 'PostgreSQL', 'Docker'];

      const resultado = validarSoftwareLaboratorio(instalado, requerido);
      expect(resultado.cumple).toBe(false);
      expect(resultado.softwareFaltante).toEqual(['PostgreSQL', 'Docker']);
    });

    test('maneja stack instalado nulo o indefinido tratándolo como vacío', () => {
      const requerido = ['IntelliJ IDEA'];

      const resNull = validarSoftwareLaboratorio(null, requerido);
      expect(resNull.cumple).toBe(false);
      expect(resNull.softwareFaltante).toEqual(['IntelliJ IDEA']);

      const resUndefined = validarSoftwareLaboratorio(undefined, requerido);
      expect(resUndefined.cumple).toBe(false);
      expect(resUndefined.softwareFaltante).toEqual(['IntelliJ IDEA']);
    });

    test('las versiones forman parte del nombre: versión distinta no cumple', () => {
      const instalado = ['Python 3.10'];
      const requerido = ['Python 3.12'];

      const resultado = validarSoftwareLaboratorio(instalado, requerido);
      expect(resultado.cumple).toBe(false);
      expect(resultado.softwareFaltante).toEqual(['Python 3.12']);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 2.6 / 5.5: Casos parametrizados — los tres escenarios obligatorios
  // del plan maestro §1.1 para laboratorio individual
  // -------------------------------------------------------------------------
  describe('Issue 5.5: test.each — cumplimiento total, parcial y stack vacío en laboratorio individual', () => {
    interface CasoSoftwareLab {
      descripcion: string;
      softwareInstalado: string[] | null;
      softwareRequerido: string[] | null;
      cumpleEsperado: boolean;
      faltanteEsperado: string[];
    }

    const casos: CasoSoftwareLab[] = [
      {
        descripcion: 'cumplimiento total — laboratorio con todos los programas requeridos',
        softwareInstalado: ['VS Code', 'Python 3.12', 'PostgreSQL'],
        softwareRequerido: ['VS Code', 'Python 3.12'],
        cumpleEsperado: true,
        faltanteEsperado: [],
      },
      {
        descripcion: 'cumplimiento parcial — laboratorio sin al menos un programa requerido',
        softwareInstalado: ['VS Code'],
        softwareRequerido: ['VS Code', 'Python 3.12', 'Docker'],
        cumpleEsperado: false,
        faltanteEsperado: ['Python 3.12', 'Docker'],
      },
      {
        descripcion: 'stack requerido vacío — siempre cumple sin importar lo instalado',
        softwareInstalado: ['VS Code'],
        softwareRequerido: [],
        cumpleEsperado: true,
        faltanteEsperado: [],
      },
      {
        descripcion: 'stack requerido nulo — equivale a vacío, siempre cumple',
        softwareInstalado: ['VS Code'],
        softwareRequerido: null,
        cumpleEsperado: true,
        faltanteEsperado: [],
      },
      {
        descripcion: 'stack instalado nulo con requerimiento — no cumple, reporta todo como faltante',
        softwareInstalado: null,
        softwareRequerido: ['Python 3.12'],
        cumpleEsperado: false,
        faltanteEsperado: ['Python 3.12'],
      },
    ];

    test.each(casos)('$descripcion', ({ softwareInstalado, softwareRequerido, cumpleEsperado, faltanteEsperado }) => {
      const resultado = validarSoftwareLaboratorio(softwareInstalado, softwareRequerido);
      expect(resultado.cumple).toBe(cumpleEsperado);
      expect(resultado.softwareFaltante).toEqual(faltanteEsperado);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 2.7: validarSoftwareBloque — bloque completo
  // -------------------------------------------------------------------------
  describe('Issue 2.7: validarSoftwareBloque — bloque completo (laboratorio y aula teórica)', () => {
    test('AULA_TEORICA: bloque cumple inmediatamente sin evaluar software', () => {
      const bloqueAula: BloqueCandidato = {
        espacios: [aula1],
        espacioIds: [aula1.id],
        capacidadTotal: 40,
        desperdicio: 5,
        piso: 1,
        pabellon: 'Pab A',
        tipo: TipoEspacio.AULA_TEORICA,
      };

      const resultado = validarSoftwareBloque(bloqueAula, ['PostgreSQL', 'Docker']);
      expect(resultado.cumple).toBe(true);
      expect(resultado.detalles).toHaveLength(0);
    });

    test('AULA_TEORICA: bloque cumple incluso cuando el stack requerido está vacío', () => {
      const bloqueAula: BloqueCandidato = {
        espacios: [aula1],
        espacioIds: [aula1.id],
        capacidadTotal: 40,
        desperdicio: 0,
        piso: 1,
        pabellon: 'Pab A',
        tipo: TipoEspacio.AULA_TEORICA,
      };

      const resultado = validarSoftwareBloque(bloqueAula, []);
      expect(resultado.cumple).toBe(true);
      expect(resultado.detalles).toHaveLength(0);
    });

    test('LABORATORIO: cumple si todos los laboratorios del bloque tienen el stack', () => {
      const bloqueLab = crearBloqueLabConEspacios([lab1]);

      const resultado = validarSoftwareBloque(bloqueLab, ['VS Code', 'PostgreSQL']);
      expect(resultado.cumple).toBe(true);
      expect(resultado.detalles).toHaveLength(0);
    });

    test('LABORATORIO: cumple cuando el stack requerido es vacío (edge case Issue 2.7)', () => {
      const bloqueLab = crearBloqueLabConEspacios([lab1, lab2]);

      const resultado = validarSoftwareBloque(bloqueLab, []);
      expect(resultado.cumple).toBe(true);
      expect(resultado.detalles).toHaveLength(0);
    });

    test('LABORATORIO: rechaza el bloque si al menos un laboratorio no cumple y registra el detalle', () => {
      const bloqueMultiLab = crearBloqueLabConEspacios([lab1, lab2]);

      const resultado = validarSoftwareBloque(bloqueMultiLab, ['VS Code', 'PostgreSQL']);
      expect(resultado.cumple).toBe(false);
      expect(resultado.motivoRechazo).toContain('Lab 102');
      expect(resultado.detalles).toHaveLength(1);
      expect(resultado.detalles[0]).toEqual({
        laboratorioId: 'lab-2',
        identificador: 'Lab 102',
        softwareFaltante: ['PostgreSQL'],
      });
    });

    test('LABORATORIO: registra todos los laboratorios cuando más de uno falla', () => {
      const bloqueMultiLab = crearBloqueLabConEspacios([lab1, lab2]);

      const resultado = validarSoftwareBloque(bloqueMultiLab, ['Docker']);
      expect(resultado.cumple).toBe(false);
      expect(resultado.detalles).toHaveLength(2);
      expect(resultado.detalles.map((d) => d.identificador)).toEqual(['Lab 101', 'Lab 102']);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 5.5: Casos parametrizados — bloque completo (3 escenarios obligatorios
  // del plan maestro §1.1 para bloques de laboratorio)
  // -------------------------------------------------------------------------
  describe('Issue 5.5: test.each — cumplimiento total, parcial y stack vacío en bloque de laboratorio', () => {
    interface CasoBloqueLab {
      descripcion: string;
      espacios: EspacioConexo[];
      softwareRequerido: string[] | null;
      cumpleEsperado: boolean;
      numDetallesFalloEsperado: number;
    }

    const labCompleto: EspacioConexo = {
      id: 'lab-c',
      identificador: 'Lab C',
      tipo: TipoEspacio.LABORATORIO,
      pabellon: 'Pab B',
      piso: 2,
      aforoNominal: 25,
      softwareInstalado: ['Python 3.12', 'VS Code', 'Docker'],
    };

    const labIncompleto: EspacioConexo = {
      id: 'lab-i',
      identificador: 'Lab I',
      tipo: TipoEspacio.LABORATORIO,
      pabellon: 'Pab B',
      piso: 2,
      aforoNominal: 25,
      softwareInstalado: ['VS Code'],
    };

    const casos: CasoBloqueLab[] = [
      {
        descripcion: 'cumplimiento total — todos los labs del bloque tienen el stack',
        espacios: [labCompleto],
        softwareRequerido: ['Python 3.12', 'Docker'],
        cumpleEsperado: true,
        numDetallesFalloEsperado: 0,
      },
      {
        descripcion: 'cumplimiento parcial — al menos un lab del bloque no tiene el stack',
        espacios: [labCompleto, labIncompleto],
        softwareRequerido: ['Python 3.12', 'Docker'],
        cumpleEsperado: false,
        numDetallesFalloEsperado: 1,
      },
      {
        descripcion: 'stack requerido vacío — bloque de laboratorio siempre cumple',
        espacios: [labCompleto, labIncompleto],
        softwareRequerido: [],
        cumpleEsperado: true,
        numDetallesFalloEsperado: 0,
      },
    ];

    test.each(casos)('$descripcion', ({ espacios, softwareRequerido, cumpleEsperado, numDetallesFalloEsperado }) => {
      const bloque = crearBloqueLabConEspacios(espacios);
      const resultado = validarSoftwareBloque(bloque, softwareRequerido);
      expect(resultado.cumple).toBe(cumpleEsperado);
      expect(resultado.detalles).toHaveLength(numDetallesFalloEsperado);
    });
  });
});
