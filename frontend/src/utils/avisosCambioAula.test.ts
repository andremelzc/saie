import { beforeEach, describe, expect, it } from 'vitest';
import {
  avisosPendientes,
  guardarAvisoVisto,
  leerAvisosVistos,
  textoEspacios,
} from './avisosCambioAula';
import type { CambioAulaDocenteDTO } from '../types/docente';

describe('avisosCambioAula (Issue 7.18)', () => {
  beforeEach(() => window.localStorage.clear());

  it('recuerda los avisos leídos sin duplicarlos', () => {
    expect(leerAvisosVistos()).toEqual([]);
    guardarAvisoVisto('a1');
    expect(guardarAvisoVisto('a1')).toEqual(['a1']);
    expect(guardarAvisoVisto('a2')).toEqual(['a2', 'a1']);
  });

  it('ignora un valor guardado que no es una lista', () => {
    window.localStorage.setItem('saie:docente:cambiosAulaVistos', '{"x":1}');
    expect(leerAvisosVistos()).toEqual([]);
  });

  it('solo deja los avisos que no se leyeron', () => {
    const cambios = [{ id: 'a1' }, { id: 'a2' }] as CambioAulaDocenteDTO[];
    expect(avisosPendientes(cambios, ['a1']).map((c) => c.id)).toEqual(['a2']);
  });

  it('describe los espacios, o «sin aula» si la sección se quedó sin espacio', () => {
    expect(textoEspacios([])).toBe('sin aula por ahora');
    expect(
      textoEspacios([{ identificador: '105', tipo: 'AULA_TEORICA', pabellon: 'Antiguo', piso: 1 }]),
    ).toBe('Aula teórica 105 (Antiguo, piso 1)');
  });
});
