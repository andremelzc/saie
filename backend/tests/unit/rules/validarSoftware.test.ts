import { TipoEspacio } from '@prisma/client';
import {
  validarSoftwareLaboratorio,
  validarSoftwareBloque,
  normalizarNombreSoftware,
} from '../../../src/rules/validarSoftware';
import { BloqueCandidato, EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';

describe('Issue 2.6, 2.7 / 5.5 - Validación de Stack de Software en Laboratorios y Bloques', () => {
  describe('Issue 2.6: validarSoftwareLaboratorio (Laboratorio Individual)', () => {
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

  describe('Issue 2.7: validarSoftwareBloque (Bloque Completo)', () => {
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

    test('LABORATORIO: cumple si todos los laboratorios del bloque tienen el stack', () => {
      const bloqueLab: BloqueCandidato = {
        espacios: [lab1],
        espacioIds: [lab1.id],
        capacidadTotal: 30,
        desperdicio: 0,
        piso: 1,
        pabellon: 'Pab A',
        tipo: TipoEspacio.LABORATORIO,
      };

      const resultado = validarSoftwareBloque(bloqueLab, ['VS Code', 'PostgreSQL']);
      expect(resultado.cumple).toBe(true);
      expect(resultado.detalles).toHaveLength(0);
    });

    test('LABORATORIO: rechaza el bloque si al menos un laboratorio no cumple y registra el detalle', () => {
      const bloqueMultiLab: BloqueCandidato = {
        espacios: [lab1, lab2],
        espacioIds: [lab1.id, lab2.id],
        capacidadTotal: 60,
        desperdicio: 10,
        piso: 1,
        pabellon: 'Pab A',
        tipo: TipoEspacio.LABORATORIO,
      };

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
      const bloqueMultiLab: BloqueCandidato = {
        espacios: [lab1, lab2],
        espacioIds: [lab1.id, lab2.id],
        capacidadTotal: 60,
        desperdicio: 10,
        piso: 1,
        pabellon: 'Pab A',
        tipo: TipoEspacio.LABORATORIO,
      };

      const resultado = validarSoftwareBloque(bloqueMultiLab, ['Docker']);
      expect(resultado.cumple).toBe(false);
      expect(resultado.detalles).toHaveLength(2);
      expect(resultado.detalles.map((d) => d.identificador)).toEqual(['Lab 101', 'Lab 102']);
    });
  });
});
