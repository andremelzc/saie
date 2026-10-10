#!/usr/bin/env node
// Convierte la exportación SVG de Canva de un plano en un SVG limpio, con un id por espacio.
//
// Uso:
//   node tools/planos/convertir-plano.mjs <exportacion.svg> --piso 1 [--out <carpeta>]
//
// Genera en la carpeta de salida (por defecto tools/planos/salida/piso-N/):
//   piso-N.svg            plano limpio: una figura por espacio, con id, clase y data-*
//   piso-N.preview.svg    el mismo plano con cada figura rotulada, para completar la tabla
//   piso-N.codigos.json   tabla figura -> código de espacio (se completa a mano y se reutiliza)
//
// Sin dependencias. Detecta las figuras por color de relleno y descarta el título, la nota
// y las etiquetas (que Canva exporta como trazos, no como texto).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Convención de colores del dibujo (acordada con quien dibuja el plano)
// ---------------------------------------------------------------------------

/** Color de relleno -> clase del espacio. El lila es ambiguo y se resuelve por tamaño. */
const COLOR_A_CLASE = {
  "#b2d9ff": "aula",
  "#ffbdbd": "escalera",
  "#ff86e4": "bano",
  "#efe7cb": "administrativo",
  "#d3c8ff": "laboratorio-o-ascensor",
  "#d0ffaf": "patio",
  "#802323": "auditorio",
  "#faff93": "biblioteca",
};

/** Colores que se descartan: la nota adhesiva y el fondo. */
const COLORES_IGNORADOS = new Set([
  "#fdf9b4",
  "#ffffff",
  "#000000",
  "#11171d",
  "#394c60",
]);

/** Un ascensor mide menos de esta fracción del área de un salón (la nota dice 30x30 frente a 100x80). */
const FRACCION_ASCENSOR = 0.4;

/** Tolerancia (unidades del plano) para reconocer la misma figura entre dos exportaciones. */
const TOLERANCIA_POSICION = 4;

/** Clases que son espacios reservables (llevan código de la base de datos). */
const CLASES_CON_CODIGO = new Set(["aula", "laboratorio", "auditorio"]);

// ---------------------------------------------------------------------------
// Geometría
// ---------------------------------------------------------------------------

const IDENTIDAD = [1, 0, 0, 1, 0, 0];

function componer(p, c) {
  return [
    p[0] * c[0] + p[2] * c[1],
    p[1] * c[0] + p[3] * c[1],
    p[0] * c[2] + p[2] * c[3],
    p[1] * c[2] + p[3] * c[3],
    p[0] * c[4] + p[2] * c[5] + p[4],
    p[1] * c[4] + p[3] * c[5] + p[5],
  ];
}

function parsearTransform(valor) {
  if (!valor) return IDENTIDAD;
  let m = IDENTIDAD;
  for (const [, tipo, args] of valor.matchAll(
    /(matrix|translate|scale)\(([^)]*)\)/g,
  )) {
    const n = args
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (tipo === "matrix") m = componer(m, n);
    else if (tipo === "translate")
      m = componer(m, [1, 0, 0, 1, n[0], n[1] ?? 0]);
    else m = componer(m, [n[0], 0, 0, n[1] ?? n[0], 0, 0]);
  }
  return m;
}

function aplicar(m, [x, y]) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Puntos de un path hecho solo de M/L/H/V/Z absolutos; `null` si trae curvas (letras). */
function puntosDePath(d) {
  const tokens =
    d.match(/[MLHVZCSQTAmlhvzcsqta]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const puntos = [];
  let cmd = "";
  let x = 0;
  let y = 0;
  for (let i = 0; i < tokens.length;) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === "Z" || cmd === "z") continue;
    if (cmd === "M" || cmd === "L") {
      x = Number(tokens[i++]);
      y = Number(tokens[i++]);
      puntos.push([x, y]);
    } else if (cmd === "H") {
      x = Number(tokens[i++]);
      puntos.push([x, y]);
    } else if (cmd === "V") {
      y = Number(tokens[i++]);
      puntos.push([x, y]);
    } else {
      return null;
    }
  }
  return puntos;
}

function caja(puntos) {
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

const redondear = (n) => Math.round(n * 100) / 100;

/** Quita el cierre repetido (M ... L al punto inicial) y los puntos duplicados consecutivos. */
function simplificar(puntos) {
  const salida = puntos.filter(
    (p, i) =>
      i === 0 ||
      Math.hypot(p[0] - puntos[i - 1][0], p[1] - puntos[i - 1][1]) > 0.01,
  );
  const a = salida[0];
  const b = salida[salida.length - 1];
  if (salida.length > 1 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01)
    salida.pop();
  return salida;
}

// ---------------------------------------------------------------------------
// Lectura del SVG exportado
// ---------------------------------------------------------------------------

function atributos(texto) {
  const attrs = {};
  for (const [, k, v] of texto.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[k] = v;
  return attrs;
}

/** Recorre el SVG acumulando transformaciones y devuelve cada path con su matriz absoluta. */
function leerElementos(svg) {
  const inicio = svg.indexOf("</defs>");
  const cuerpo = inicio >= 0 ? svg.slice(inicio + 7) : svg;
  const pila = [IDENTIDAD];
  const elementos = [];

  for (const [, cierre, etiqueta, resto, autocierre] of cuerpo.matchAll(
    /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g,
  )) {
    if (cierre) {
      if (etiqueta === "g") pila.pop();
      continue;
    }
    const attrs = atributos(resto);
    const matriz = componer(
      pila[pila.length - 1],
      parsearTransform(attrs.transform),
    );

    if (etiqueta === "g") {
      if (!autocierre) pila.push(matriz);
    } else if (etiqueta === "path" || etiqueta === "rect") {
      elementos.push({ etiqueta, attrs, matriz });
    }
  }
  return elementos;
}

function aPuntosAbsolutos(el) {
  let locales;
  if (el.etiqueta === "rect") {
    const x = Number(el.attrs.x ?? 0);
    const y = Number(el.attrs.y ?? 0);
    const w = Number(el.attrs.width);
    const h = Number(el.attrs.height);
    locales = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
  } else {
    locales = puntosDePath(el.attrs.d ?? "");
  }
  return locales ? locales.map((p) => aplicar(el.matriz, p)) : null;
}

// ---------------------------------------------------------------------------
// Extracción de figuras
// ---------------------------------------------------------------------------

function extraerFiguras(elementos) {
  const figuras = [];
  const vistos = new Set();
  const advertencias = [];
  const muros = [];

  for (const el of elementos) {
    const fill = (el.attrs.fill ?? "").toLowerCase();
    const puntos = aPuntosAbsolutos(el);
    if (!puntos || puntos.length < 3) continue;

    // Muros: líneas de trazo sin relleno. Los contornos de los espacios son rectángulos
    // de 4 vértices y se descartan; quedan el perímetro y los muros interiores.
    if (fill === "none" && el.attrs.stroke) {
      const simples = simplificar(puntos);
      if (simples.length > 4) muros.push(simples);
      continue;
    }

    if (COLORES_IGNORADOS.has(fill) || !fill.startsWith("#")) continue;

    const clase = COLOR_A_CLASE[fill];
    if (!clase) {
      advertencias.push(`Color sin clasificar ${fill}: se ignora una figura`);
      continue;
    }

    const poligono = simplificar(puntos);
    const c = caja(poligono);
    const clave = `${fill}|${redondear(c.x)}|${redondear(c.y)}|${redondear(c.w)}|${redondear(c.h)}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    figuras.push({ fill, clase, poligono, ...c });
  }

  return { figuras, muros, advertencias };
}

/** Resuelve el lila (laboratorio o ascensor) comparando el área con la de un salón típico. */
function resolverAmbiguos(figuras) {
  const areas = figuras
    .filter((f) => f.clase === "aula")
    .map((f) => f.w * f.h)
    .sort((a, b) => a - b);
  const areaSalon = areas.length ? areas[Math.floor(areas.length / 2)] : 0;

  for (const f of figuras) {
    if (f.clase !== "laboratorio-o-ascensor") continue;
    f.clase =
      areaSalon && f.w * f.h < areaSalon * FRACCION_ASCENSOR
        ? "ascensor"
        : "laboratorio";
  }
}

/** Orden de lectura: filas de arriba abajo (agrupadas por tolerancia) y, dentro, izquierda a derecha. */
function ordenarLectura(figuras) {
  const ordenadas = [...figuras].sort((a, b) => a.y - b.y || a.x - b.x);
  const filas = [];
  for (const f of ordenadas) {
    const fila = filas.find((r) => Math.abs(r.y - f.y) <= 12);
    if (fila) fila.items.push(f);
    else filas.push({ y: f.y, items: [f] });
  }
  return filas.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

// ---------------------------------------------------------------------------
// Normalización, tabla de códigos y salida
// ---------------------------------------------------------------------------

function normalizar(figuras, muros, margen = 20) {
  const todos = [...figuras.flatMap((f) => f.poligono), ...muros.flat()];
  const c = caja(todos);
  const mover = ([x, y]) => [
    redondear(x - c.x + margen),
    redondear(y - c.y + margen),
  ];

  for (const f of figuras) {
    f.poligono = f.poligono.map(mover);
    Object.assign(f, caja(f.poligono));
  }
  return {
    muros: muros.map((m) => m.map(mover)),
    ancho: Math.ceil(c.w + margen * 2),
    alto: Math.ceil(c.h + margen * 2),
  };
}

function cargarTabla(ruta) {
  if (!existsSync(ruta)) return { figuras: [], sinFigura: [] };
  const tabla = JSON.parse(readFileSync(ruta, "utf-8"));
  return { figuras: tabla.figuras ?? [], sinFigura: tabla.sinFigura ?? [] };
}

/**
 * Asigna un código a cada figura reutilizando la tabla anterior: misma clase y centro dentro
 * de la tolerancia. Lo que no coincide queda con código provisional y se informa.
 * Los códigos que ya no encuentran figura se devuelven en `sinFigura` para no perderlos.
 */
function asignarCodigos(figuras, tablaPrevia, piso) {
  const avisos = [];
  const usadas = new Set();
  let n = 0;

  for (const f of figuras) {
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    const previa = tablaPrevia.find(
      (t, i) =>
        !usadas.has(i) &&
        t.clase === f.clase &&
        t.codigo &&
        Math.abs(t.cx - cx) <= TOLERANCIA_POSICION &&
        Math.abs(t.cy - cy) <= TOLERANCIA_POSICION &&
        (usadas.add(i), true),
    );

    n += 1;
    f.figura = `FIG-${String(n).padStart(2, "0")}`;
    f.codigo = previa?.codigo ?? "";
    f.id = f.codigo || f.figura;
    if (!previa && CLASES_CON_CODIGO.has(f.clase)) {
      avisos.push(
        `${f.figura} (${f.clase}) no tiene código asignado: usa el id provisional`,
      );
    }
  }

  const sinFigura = [];
  tablaPrevia.forEach((t, i) => {
    if (t.codigo && !usadas.has(i)) {
      sinFigura.push(t);
      avisos.push(
        `El código ${t.codigo} (${t.clase}) ya no coincide con ninguna figura: se guarda en "sinFigura"`,
      );
    }
  });

  const codigos = figuras.filter((f) => f.codigo).map((f) => f.codigo);
  for (const c of new Set(codigos.filter((c, i) => codigos.indexOf(c) !== i))) {
    avisos.push(`El código ${c} está repetido`);
  }
  void piso;
  return { avisos, sinFigura };
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");

function esRectangulo(f) {
  return (
    f.poligono.length === 4 &&
    f.poligono.every(
      (p) =>
        (Math.abs(p[0] - f.x) < 0.5 || Math.abs(p[0] - (f.x + f.w)) < 0.5) &&
        (Math.abs(p[1] - f.y) < 0.5 || Math.abs(p[1] - (f.y + f.h)) < 0.5),
    )
  );
}

function figuraSvg(f) {
  const atributosComunes = `id="${esc(f.id)}" class="${f.clase === "aula" || f.clase === "laboratorio" ? `espacio ${f.clase}` : f.clase}" data-clase="${f.clase}"`;
  if (esRectangulo(f)) {
    return `<rect ${atributosComunes} x="${redondear(f.x)}" y="${redondear(f.y)}" width="${redondear(f.w)}" height="${redondear(f.h)}"/>`;
  }
  const puntos = f.poligono.map((p) => p.join(",")).join(" ");
  return `<polygon ${atributosComunes} points="${puntos}"/>`;
}

const GRUPOS = [
  ["patios", ["patio"]],
  [
    "espacios",
    [
      "aula",
      "laboratorio",
      "auditorio",
      "administrativo",
      "biblioteca",
      "bano",
    ],
  ],
  ["escaleras", ["escalera"]],
  ["ascensores", ["ascensor"]],
];

function generarSvgLimpio(figuras, geometria, piso) {
  const capas = GRUPOS.map(([nombre, clases]) => {
    const items = figuras
      .filter((f) => clases.includes(f.clase))
      .map(figuraSvg);
    return `  <g id="${nombre}">\n${items.map((i) => `    ${i}`).join("\n")}\n  </g>`;
  }).join("\n");
  const lineas = geometria.muros
    .map(
      (m, i) =>
        `    <polyline id="muro-${i + 1}" class="muro" points="${m.map((p) => p.join(",")).join(" ")}"/>`,
    )
    .join("\n");
  const muros = lineas ? `  <g id="muros">\n${lineas}\n  </g>\n` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometria.ancho} ${geometria.alto}" role="img" data-piso="${piso}">
  <title>Plano del piso ${piso}</title>
  <style>
    .espacio, .administrativo, .biblioteca, .auditorio, .bano, .escalera, .ascensor { stroke: #222; stroke-width: 1; }
    .aula { fill: #b2d9ff; } .laboratorio { fill: #d3c8ff; } .auditorio { fill: #802323; }
    .administrativo { fill: #efe7cb; } .biblioteca { fill: #faff93; } .bano { fill: #ff86e4; }
    .escalera { fill: #ffbdbd; } .ascensor { fill: #d3c8ff; } .patio { fill: #d0ffaf; stroke: none; }
    .muro { fill: none; stroke: #4a4a44; stroke-width: 2; }
  </style>
${capas}
${muros}</svg>
`;
}

function generarPreview(figuras, geometria, piso) {
  const base = generarSvgLimpio(figuras, geometria, piso).replace(
    "</svg>\n",
    "",
  );
  const etiquetas = figuras
    .filter((f) => f.clase !== "patio")
    .map(
      (f) =>
        `<text x="${redondear(f.x + f.w / 2)}" y="${redondear(f.y + f.h / 2)}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="7" fill="#000">${esc(f.codigo || f.figura)}</text>`,
    )
    .join("\n    ");
  return `${base}  <g id="rotulos">\n    ${etiquetas}\n  </g>\n</svg>\n`;
}

// ---------------------------------------------------------------------------
// Programa principal
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const entrada = args.find((a) => !a.startsWith("--"));
  const opcion = (nombre) => {
    const i = args.indexOf(`--${nombre}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const piso = opcion("piso");

  if (!entrada || !piso) {
    console.error(
      "Uso: node convertir-plano.mjs <exportacion.svg> --piso N [--out carpeta]",
    );
    process.exit(1);
  }

  const aqui = path.dirname(fileURLToPath(import.meta.url));
  const salida = path.resolve(
    opcion("out") ?? path.join(aqui, "salida", `piso-${piso}`),
  );
  mkdirSync(salida, { recursive: true });
  const rutaTabla = path.join(salida, `piso-${piso}.codigos.json`);

  const { figuras, muros, advertencias } = extraerFiguras(
    leerElementos(readFileSync(entrada, "utf-8")),
  );
  resolverAmbiguos(figuras);
  const geometria = normalizar(figuras, muros);
  const ordenadas = ordenarLectura(figuras);
  const previa = cargarTabla(rutaTabla);
  const asignacion = asignarCodigos(ordenadas, previa.figuras, piso);
  const avisos = [...advertencias, ...asignacion.avisos];
  // Un código huérfano que vuelve a coincidir con una figura (se devolvió a su lugar) se recupera.
  const sinFigura = [...asignacion.sinFigura, ...previa.sinFigura].filter(
    (t, i, todos) =>
      !ordenadas.some((f) => f.codigo === t.codigo) &&
      todos.findIndex((x) => x.codigo === t.codigo) === i,
  );

  writeFileSync(
    path.join(salida, `piso-${piso}.svg`),
    generarSvgLimpio(ordenadas, geometria, piso),
  );
  writeFileSync(
    path.join(salida, `piso-${piso}.preview.svg`),
    generarPreview(ordenadas, geometria, piso),
  );
  writeFileSync(
    rutaTabla,
    JSON.stringify(
      {
        piso: Number(piso),
        instrucciones:
          'Completa "codigo" en los espacios reservables (aula, laboratorio, auditorio) con el id de la base de datos, p. ej. NUE-101. Vuelve a ejecutar el script: reutiliza los códigos por posición.',
        sinFigura,
        figuras: ordenadas.map((f) => ({
          figura: f.figura,
          clase: f.clase,
          codigo: f.codigo,
          cx: redondear(f.x + f.w / 2),
          cy: redondear(f.y + f.h / 2),
          ancho: redondear(f.w),
          alto: redondear(f.h),
        })),
      },
      null,
      2,
    ) + "\n",
  );

  const porClase = Object.entries(
    ordenadas.reduce(
      (acc, f) => ({ ...acc, [f.clase]: (acc[f.clase] ?? 0) + 1 }),
      {},
    ),
  )
    .map(([c, n]) => `${c}: ${n}`)
    .join(", ");
  console.log(`Figuras detectadas (${ordenadas.length}): ${porClase}`);
  console.log(
    `Muros: ${muros.length} (${muros.map((m) => `${m.length} vértices`).join(", ") || "ninguno"})`,
  );
  console.log(`Salida en ${salida}`);
  for (const a of avisos) console.warn(`AVISO: ${a}`);
}

main();
