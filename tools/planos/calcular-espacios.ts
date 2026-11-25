// Calcula, a partir de los planos de assets/planos/, los datos de los espacios que dependen de la
// geometría: qué aulas y laboratorios son contiguos (comparten pared) y a qué distancia caminando
// está cada uno del ascensor de su pabellón. El plano no tiene escala: las distancias están en
// unidades del plano y solo sirven para comparar.
//
// Uso (desde la raíz del repositorio):
//   npx tsx tools/planos/calcular-espacios.ts            # resumen por pantalla
//   npx tsx tools/planos/calcular-espacios.ts --json     # el resultado completo en JSON
//
// El resultado trae los nombres de la base de datos (pabellón e identificador), listos para las
// hojas «Contiguos» (solo pares del mismo tipo, como exige el seed) y la columna `distancia_ascensor` de la hoja «Espacios» del seed.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { distanciasAlAscensor, parejasContiguas } from '../../frontend/src/components/mapa2d/pasillos';
import type { FiguraPlano2D, Plano2D } from '../../frontend/src/components/mapa2d/plano';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PISOS = [1, 2, 3];
const PABELLON_DE_PREFIJO: Record<string, string> = { NUE: 'Nuevo Pabellón', ANT: 'Antiguo Pabellón' };

const atributo = (etiqueta: string, nombre: string) =>
  etiqueta.match(new RegExp(` ${nombre}="([^"]*)"`))?.[1] ?? '';

/** Lectura mínima del SVG limpio sin DOM (la del navegador es `leerPlano2D`). */
function leerPlano(piso: number): Plano2D {
  const texto = readFileSync(path.join(RAIZ, 'assets/planos', `piso-${piso}.svg`), 'utf8');
  const figuras: FiguraPlano2D[] = [];
  for (const [etiqueta, tipo] of [...texto.matchAll(/<(rect|polygon) [^>]*>/g)].map((m) => [m[0], m[1]])) {
    const clase = atributo(etiqueta, 'data-clase');
    const id = atributo(etiqueta, 'id');
    if (!clase || !id) continue;
    const nombre = atributo(etiqueta, 'data-nombre');
    if (tipo === 'rect') {
      const r = {
        x: Number(atributo(etiqueta, 'x')),
        y: Number(atributo(etiqueta, 'y')),
        ancho: Number(atributo(etiqueta, 'width')),
        alto: Number(atributo(etiqueta, 'height')),
      };
      figuras.push({ id, clase, nombre, rect: r, puntos: null, caja: { ...r } });
    } else {
      const puntos = atributo(etiqueta, 'points');
      const pares = puntos.trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const xs = pares.map((p) => p[0]);
      const ys = pares.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      figuras.push({
        id,
        clase,
        nombre,
        rect: null,
        puntos,
        caja: { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y },
      });
    }
  }
  return { caja: { x: -20, y: -20, ancho: 424, alto: 430 }, figuras, muros: [] };
}

interface Resultado {
  contiguos: { pabellon: string; espacioA: string; espacioB: string }[];
  distanciaAscensor: { pabellon: string; identificador: string; distancia: number }[];
}

export function calcular(): Resultado {
  const resultado: Resultado = { contiguos: [], distanciaAscensor: [] };
  for (const piso of PISOS) {
    const plano = leerPlano(piso);
    const nombre = new Map(plano.figuras.map((f) => [f.id, f.nombre]));
    const clase = new Map(plano.figuras.map((f) => [f.id, f.clase]));
    const pabellon = (id: string) => PABELLON_DE_PREFIJO[id.slice(0, 3)];

    for (const [a, b] of parejasContiguas(plano.figuras)) {
      // El seed (y el motor) solo emparejan espacios del mismo tipo: aula con aula, laboratorio con laboratorio.
      if (clase.get(a) !== clase.get(b)) continue;
      const [primero, segundo] = [a, b].sort((x, y) => (nombre.get(x) ?? '').localeCompare(nombre.get(y) ?? ''));
      resultado.contiguos.push({
        pabellon: pabellon(a),
        espacioA: nombre.get(primero) ?? primero,
        espacioB: nombre.get(segundo) ?? segundo,
      });
    }
    for (const [id, distancia] of distanciasAlAscensor(plano)) {
      resultado.distanciaAscensor.push({
        pabellon: pabellon(id),
        identificador: nombre.get(id) ?? id,
        distancia,
      });
    }
  }
  return resultado;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = calcular();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`Pares contiguos: ${r.contiguos.length}`);
    for (const c of r.contiguos) console.log(`  ${c.pabellon} | ${c.espacioA} — ${c.espacioB}`);
    console.log(`Distancia al ascensor (unidades del plano): ${r.distanciaAscensor.length} espacios`);
    for (const d of r.distanciaAscensor) console.log(`  ${d.pabellon} | ${d.identificador}: ${d.distancia}`);
  }
}
