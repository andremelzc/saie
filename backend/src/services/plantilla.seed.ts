import ExcelJS from 'exceljs';
import { z } from 'zod';
import { DiaSemana, PrismaClient, TipoEspacio } from '@prisma/client';
import {
  importarCursosYSecciones,
  CursoSeccionSchema,
} from '../importers/cursosSecciones.importer';
import { importarDocentes, DocenteSchema } from '../importers/docentes.importer';
import { importarHorarios, HorarioSchema } from '../importers/horarios.importer';
import { importarMatriculas, MatriculaSchema } from '../importers/matriculas.importer';
import { normalizarNombreSoftware } from '../rules/validarSoftware';
import {
  EspacioSeedData,
  ParContiguoSeed,
  sembrarEspaciosYContiguedades,
} from './contiguedad.seed';

/** Prefijo de los alumnos anónimos que solo aportan la demanda (cantidad) de cada sección. */
export const PREFIJO_ALUMNO_ANONIMO = 'X-';
const SUFIJO_LAB = '-LAB';

export interface DatosPlantilla {
  espacios: EspacioSeedData[];
  contiguos: ParContiguoSeed[];
  docentes: z.infer<typeof DocenteSchema>[];
  secciones: Array<
    z.infer<typeof CursoSeccionSchema> & { codigoDocente: string | null; matriculados: number }
  >;
  horarios: z.infer<typeof HorarioSchema>[];
  alumnos: Array<{
    codigoAlumno: string;
    nombre: string;
    correo: string;
    telefono: string | null;
    movilidadReducida: boolean;
  }>;
  matriculas: Array<{
    codigoAlumno: string;
    codigoCurso: string;
    codigoSeccion: string;
    periodo: string;
  }>;
}

export interface ResultadoLectura {
  datos: DatosPlantilla;
  errores: string[];
  avisos: string[];
}

// ---------------------------------------------------------------------------
// Lectura de celdas
// ---------------------------------------------------------------------------

function aTexto(valor: ExcelJS.CellValue | undefined): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (valor instanceof Date) return valor.toISOString();
  if ('richText' in valor) {
    return valor.richText
      .map((t) => t.text)
      .join('')
      .trim();
  }
  if ('result' in valor) return aTexto(valor.result as ExcelJS.CellValue | undefined);
  if ('text' in valor) return String(valor.text).trim();
  return '';
}

function aHora(raw: ExcelJS.CellValue | undefined, texto: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(texto);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  // Excel puede convertir una hora escrita a mano en fecha u hora decimal.
  if (raw instanceof Date) {
    return `${String(raw.getUTCHours()).padStart(2, '0')}:${String(raw.getUTCMinutes()).padStart(2, '0')}`;
  }
  if (typeof raw === 'number' && raw > 0 && raw < 1) {
    const minutos = Math.round(raw * 1440);
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  }
  return null;
}

const entero = (t: string): number | null => (/^-?\d+$/.test(t) ? Number(t) : null);
const lista = (t: string): string[] =>
  t
    .split(/[;|]/)
    .map((x) => x.trim())
    .filter(Boolean);

/** `undefined` = vacío; `null` = valor inválido. */
function siNo(t: string): boolean | undefined | null {
  if (t === '') return undefined;
  const v = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (['SI', 'S', 'TRUE', '1', 'X'].includes(v)) return true;
  if (['NO', 'N', 'FALSE', '0'].includes(v)) return false;
  return null;
}

interface Fila {
  fila: number;
  v: Record<string, string>;
  raw: Record<string, ExcelJS.CellValue | undefined>;
}

function leerHoja(
  wb: ExcelJS.Workbook,
  nombre: string,
  columnas: string[],
  errores: string[],
): Fila[] {
  const ws = wb.getWorksheet(nombre);
  if (!ws) {
    errores.push(`Falta la hoja '${nombre}'`);
    return [];
  }
  const encabezados: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    encabezados[col] = aTexto(cell.value).toLowerCase();
  });
  for (const c of columnas) {
    if (!encabezados.includes(c)) errores.push(`Hoja '${nombre}': falta la columna '${c}'`);
  }
  const filas: Fila[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const v: Record<string, string> = {};
    const raw: Record<string, ExcelJS.CellValue | undefined> = {};
    let vacia = true;
    encabezados.forEach((h, col) => {
      if (!h) return;
      const valor = row.getCell(col).value;
      raw[h] = valor;
      v[h] = aTexto(valor);
      if (v[h] !== '') vacia = false;
    });
    if (!vacia) filas.push({ fila: r, v, raw });
  }
  return filas;
}

const sinAcentosMayus = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// ---------------------------------------------------------------------------
// Lectura y validación completa de la plantilla (no toca la base de datos)
// ---------------------------------------------------------------------------

export async function leerPlantilla(ruta: string): Promise<ResultadoLectura> {
  const errores: string[] = [];
  const avisos: string[] = [];
  const datos: DatosPlantilla = {
    espacios: [],
    contiguos: [],
    docentes: [],
    secciones: [],
    horarios: [],
    alumnos: [],
    matriculas: [],
  };

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(ruta);
  } catch (e) {
    errores.push(`No se pudo abrir '${ruta}': ${e instanceof Error ? e.message : String(e)}`);
    return { datos, errores, avisos };
  }

  // ---- Espacios
  const espaciosPorClave = new Map<string, EspacioSeedData>();
  for (const { fila, v } of leerHoja(
    wb,
    'Espacios',
    ['pabellon', 'identificador', 'tipo', 'piso', 'aforo_nominal', 'habilitado'],
    errores,
  )) {
    const ref = `Espacios fila ${fila}`;
    const tipo = sinAcentosMayus(v.tipo) as TipoEspacio;
    if (!Object.values(TipoEspacio).includes(tipo)) {
      errores.push(`${ref}: tipo inválido '${v.tipo}' (usa AULA_TEORICA o LABORATORIO)`);
      continue;
    }
    if (!v.pabellon || !v.identificador) {
      errores.push(`${ref}: pabellón e identificador son obligatorios`);
      continue;
    }
    const piso = entero(v.piso);
    const aforo = v.aforo_nominal === '' ? 0 : entero(v.aforo_nominal);
    const habilitado = siNo(v.habilitado);
    if (piso === null) errores.push(`${ref}: piso inválido '${v.piso}'`);
    if (aforo === null || aforo < 0) errores.push(`${ref}: aforo inválido '${v.aforo_nominal}'`);
    if (habilitado === null)
      errores.push(`${ref}: habilitado debe ser SI o NO ('${v.habilitado}')`);
    if (piso === null || aforo === null || aforo < 0 || habilitado === null) continue;

    // Columna opcional: distancia (metros) hasta el ascensor; base de la accesibilidad (R-07).
    let distancia: number | null = null;
    if (v.distancia_ascensor) {
      distancia = entero(v.distancia_ascensor);
      if (distancia === null || distancia < 0) {
        errores.push(`${ref}: distancia_ascensor inválida '${v.distancia_ascensor}'`);
        continue;
      }
    }

    if (habilitado !== false && aforo < 1) {
      errores.push(
        `${ref} (${v.identificador}): un espacio habilitado necesita un aforo mayor a 0`,
      );
    }
    const esLab = tipo === TipoEspacio.LABORATORIO;
    const pcs = v.pcs_malogradas === '' ? 0 : entero(v.pcs_malogradas);
    if (pcs === null || pcs < 0) {
      errores.push(`${ref}: pcs_malogradas inválido '${v.pcs_malogradas}'`);
      continue;
    }
    if (esLab && pcs > aforo) {
      errores.push(
        `${ref} (${v.identificador}): las PCs malogradas (${pcs}) superan el aforo (${aforo})`,
      );
    }
    if (!esLab && (pcs > 0 || v.software_instalado)) {
      avisos.push(`${ref}: un aula teórica no tiene PCs ni software; se ignoran`);
    }
    const clave = `${v.pabellon}::${v.identificador}`;
    if (espaciosPorClave.has(clave)) {
      errores.push(`${ref}: espacio repetido (${v.pabellon} / ${v.identificador})`);
      continue;
    }
    const espacio: EspacioSeedData = {
      pabellon: v.pabellon,
      identificador: v.identificador,
      tipo,
      piso,
      aforoNominal: aforo,
      softwareInstalado: esLab ? lista(v.software_instalado ?? '') : [],
      pcsMalogradas: esLab ? pcs : null,
      habilitado,
      descripcionUso: v.descripcion_uso ? v.descripcion_uso : null,
      distanciaAscensor: distancia,
    };
    espaciosPorClave.set(clave, espacio);
    datos.espacios.push(espacio);
  }

  // ---- Contiguos
  for (const { fila, v } of leerHoja(
    wb,
    'Contiguos',
    ['pabellon', 'espacio_a', 'espacio_b'],
    errores,
  )) {
    const ref = `Contiguos fila ${fila}`;
    const a = espaciosPorClave.get(`${v.pabellon}::${v.espacio_a}`);
    const b = espaciosPorClave.get(`${v.pabellon}::${v.espacio_b}`);
    if (!a || !b) {
      errores.push(
        `${ref}: no existe '${!a ? v.espacio_a : v.espacio_b}' en '${v.pabellon}' (hoja Espacios)`,
      );
    } else if (a === b) {
      errores.push(`${ref}: un espacio no puede ser contiguo a sí mismo`);
    } else if (a.tipo !== b.tipo) {
      errores.push(`${ref}: '${a.identificador}' y '${b.identificador}' son de distinto tipo`);
    } else if (a.piso !== b.piso) {
      errores.push(`${ref}: '${a.identificador}' y '${b.identificador}' están en pisos distintos`);
    } else {
      datos.contiguos.push({
        identificadorA: v.espacio_a,
        identificadorB: v.espacio_b,
        pabellon: v.pabellon,
      });
    }
  }

  // ---- Docentes
  const codigosDocente = new Set<string>();
  for (const { fila, v } of leerHoja(
    wb,
    'Docentes',
    ['codigo_docente', 'nombre', 'correo_institucional', 'departamento'],
    errores,
  )) {
    const ref = `Docentes fila ${fila}`;
    const r = DocenteSchema.safeParse({
      codigoDocente: v.codigo_docente,
      nombre: v.nombre,
      correoInstitucional: v.correo_institucional,
      departamento: v.departamento,
    });
    if (!r.success) {
      errores.push(`${ref}: ${r.error.issues.map((i) => i.message).join(', ')}`);
    } else if (codigosDocente.has(r.data.codigoDocente)) {
      errores.push(`${ref}: código de docente repetido (${r.data.codigoDocente})`);
    } else {
      codigosDocente.add(r.data.codigoDocente);
      datos.docentes.push(r.data);
    }
  }

  // ---- Cursos y secciones
  const seccionesPorClave = new Map<string, DatosPlantilla['secciones'][number]>();
  const nombresDeCurso = new Map<string, string>();
  for (const { fila, v } of leerHoja(
    wb,
    'Cursos_Secciones',
    ['codigo_curso', 'nombre_curso', 'codigo_seccion', 'periodo', 'tipo_espacio_requerido'],
    errores,
  )) {
    const ref = `Cursos_Secciones fila ${fila}`;
    const r = CursoSeccionSchema.safeParse({
      codigoCurso: v.codigo_curso,
      nombreCurso: v.nombre_curso,
      codigoSeccion: v.codigo_seccion,
      periodo: v.periodo,
      tipoEspacioRequerido: sinAcentosMayus(v.tipo_espacio_requerido),
      stackSoftwareRequerido: lista(v.software_requerido ?? ''),
    });
    if (!r.success) {
      errores.push(`${ref}: ${r.error.issues.map((i) => i.message).join(', ')}`);
      continue;
    }
    const matriculados =
      v.matriculados === '' || v.matriculados === undefined ? 0 : entero(v.matriculados);
    if (matriculados === null || matriculados < 0) {
      errores.push(`${ref}: matriculados inválido '${v.matriculados}'`);
      continue;
    }
    const codigoDocente = v.codigo_docente ? v.codigo_docente : null;
    if (codigoDocente && !codigosDocente.has(codigoDocente)) {
      errores.push(`${ref}: el docente '${codigoDocente}' no está en la hoja Docentes`);
      continue;
    }
    const clave = `${r.data.codigoCurso}|${r.data.codigoSeccion}`;
    if (seccionesPorClave.has(clave)) {
      errores.push(`${ref}: sección repetida (${r.data.codigoCurso} / ${r.data.codigoSeccion})`);
      continue;
    }
    const previo = nombresDeCurso.get(r.data.codigoCurso);
    if (previo && previo !== r.data.nombreCurso) {
      avisos.push(`${ref}: el curso ${r.data.codigoCurso} aparece con dos nombres distintos`);
    }
    nombresDeCurso.set(r.data.codigoCurso, r.data.nombreCurso);
    const seccion = { ...r.data, codigoDocente, matriculados };
    seccionesPorClave.set(clave, seccion);
    datos.secciones.push(seccion);
  }
  for (const s of datos.secciones) {
    if (s.codigoSeccion.endsWith(SUFIJO_LAB)) {
      const base = s.codigoSeccion.slice(0, -SUFIJO_LAB.length);
      if (!seccionesPorClave.has(`${s.codigoCurso}|${base}`)) {
        avisos.push(
          `La sección ${s.codigoCurso} / ${s.codigoSeccion} no tiene su sección de teoría '${base}'`,
        );
      }
    }
  }

  // ---- Horarios (el periodo se toma de la sección)
  const seccionesConHorario = new Set<string>();
  for (const { fila, v, raw } of leerHoja(
    wb,
    'Horarios',
    ['codigo_curso', 'codigo_seccion', 'dia', 'hora_inicio', 'hora_fin'],
    errores,
  )) {
    const ref = `Horarios fila ${fila}`;
    const clave = `${v.codigo_curso}|${v.codigo_seccion}`;
    const seccion = seccionesPorClave.get(clave);
    if (!seccion) {
      errores.push(
        `${ref}: la sección ${v.codigo_curso} / ${v.codigo_seccion} no está en Cursos_Secciones`,
      );
      continue;
    }
    const inicio = aHora(raw.hora_inicio, v.hora_inicio);
    const fin = aHora(raw.hora_fin, v.hora_fin);
    const r = HorarioSchema.safeParse({
      codigoCurso: v.codigo_curso,
      codigoSeccion: v.codigo_seccion,
      periodo: seccion.periodo,
      diaSemana: sinAcentosMayus(v.dia) as DiaSemana,
      horaInicio: inicio ?? v.hora_inicio,
      horaFin: fin ?? v.hora_fin,
    });
    if (!r.success) {
      errores.push(`${ref}: ${r.error.issues.map((i) => i.message).join(', ')}`);
    } else if (r.data.horaInicio >= r.data.horaFin) {
      errores.push(
        `${ref}: la hora de inicio (${r.data.horaInicio}) debe ser menor a la de fin (${r.data.horaFin})`,
      );
    } else {
      seccionesConHorario.add(clave);
      datos.horarios.push(r.data);
    }
  }
  for (const [clave, s] of seccionesPorClave) {
    if (!seccionesConHorario.has(clave)) {
      avisos.push(
        `La sección ${s.codigoCurso} / ${s.codigoSeccion} no tiene horario: el motor no la asignará`,
      );
    }
  }

  // ---- Alumnos y matrículas (solo alumnos con cuenta)
  const alumnosPorCodigo = new Map<string, DatosPlantilla['alumnos'][number]>();
  for (const { fila, v } of leerHoja(
    wb,
    'Alumnos',
    ['codigo_alumno', 'nombre', 'correo'],
    errores,
  )) {
    const ref = `Alumnos fila ${fila}`;
    if (!v.codigo_alumno || !v.nombre) {
      errores.push(`${ref}: código y nombre son obligatorios`);
      continue;
    }
    if (!z.string().email().safeParse(v.correo).success) {
      errores.push(`${ref}: correo inválido '${v.correo}'`);
      continue;
    }
    const movilidad = siNo(v.movilidad_reducida ?? '');
    if (movilidad === null) {
      errores.push(`${ref}: movilidad_reducida debe ser SI o NO`);
      continue;
    }
    if (alumnosPorCodigo.has(v.codigo_alumno)) {
      errores.push(`${ref}: código de alumno repetido (${v.codigo_alumno})`);
      continue;
    }
    if (v.codigo_alumno.startsWith(PREFIJO_ALUMNO_ANONIMO)) {
      errores.push(
        `${ref}: el código no puede empezar con '${PREFIJO_ALUMNO_ANONIMO}' (reservado)`,
      );
      continue;
    }
    const alumno = {
      codigoAlumno: v.codigo_alumno,
      nombre: v.nombre,
      correo: v.correo,
      telefono: (v.telefono ?? '').replace(/\s+/g, '') || null,
      movilidadReducida: movilidad === true,
    };
    alumnosPorCodigo.set(alumno.codigoAlumno, alumno);
    datos.alumnos.push(alumno);
  }

  const matriculadosReales = new Map<string, number>();
  const conMatricula = new Set<string>();
  const vistas = new Set<string>();
  for (const { fila, v } of leerHoja(
    wb,
    'Matriculas',
    ['codigo_alumno', 'codigo_curso', 'codigo_seccion'],
    errores,
  )) {
    const ref = `Matriculas fila ${fila}`;
    const seccion = seccionesPorClave.get(`${v.codigo_curso}|${v.codigo_seccion}`);
    if (!alumnosPorCodigo.has(v.codigo_alumno)) {
      errores.push(`${ref}: el alumno '${v.codigo_alumno}' no está en la hoja Alumnos`);
    } else if (!seccion) {
      errores.push(
        `${ref}: la sección ${v.codigo_curso} / ${v.codigo_seccion} no está en Cursos_Secciones`,
      );
    } else if (vistas.has(`${v.codigo_alumno}|${v.codigo_curso}|${v.codigo_seccion}`)) {
      errores.push(`${ref}: matrícula repetida`);
    } else {
      vistas.add(`${v.codigo_alumno}|${v.codigo_curso}|${v.codigo_seccion}`);
      conMatricula.add(v.codigo_alumno);
      datos.matriculas.push({
        codigoAlumno: v.codigo_alumno,
        codigoCurso: v.codigo_curso,
        codigoSeccion: v.codigo_seccion,
        periodo: seccion.periodo,
      });
      const k = `${v.codigo_curso}|${v.codigo_seccion}`;
      matriculadosReales.set(k, (matriculadosReales.get(k) ?? 0) + 1);
    }
  }
  for (const a of datos.alumnos) {
    if (!conMatricula.has(a.codigoAlumno)) {
      avisos.push(
        `El alumno ${a.codigoAlumno} no tiene matrículas: no se creará (el sistema crea alumnos al matricularlos)`,
      );
    }
  }
  for (const [clave, n] of matriculadosReales) {
    const s = seccionesPorClave.get(clave);
    if (s && n > s.matriculados) {
      avisos.push(
        `La sección ${clave.replace('|', ' / ')} tiene ${n} alumnos reales pero 'matriculados' = ${s.matriculados}`,
      );
    }
  }

  // ---- Software requerido que ningún laboratorio habilitado tiene
  const instalado = new Set(
    datos.espacios
      .filter((e) => e.tipo === TipoEspacio.LABORATORIO && e.habilitado !== false)
      .flatMap((e) => e.softwareInstalado ?? [])
      .map(normalizarNombreSoftware),
  );
  const faltantes = new Map<string, string[]>();
  for (const s of datos.secciones) {
    for (const req of s.stackSoftwareRequerido) {
      if (!instalado.has(normalizarNombreSoftware(req))) {
        faltantes.set(req, [...(faltantes.get(req) ?? []), `${s.codigoCurso}/${s.codigoSeccion}`]);
      }
    }
  }
  for (const [sw, secs] of faltantes) {
    avisos.push(
      `Ningún laboratorio habilitado tiene '${sw}' (pedido por ${secs.length} sección/es): irán a revisión manual`,
    );
  }

  return { datos, errores, avisos };
}

// ---------------------------------------------------------------------------
// Carga en la base de datos
// ---------------------------------------------------------------------------

export interface ResumenCarga {
  espacios: number;
  contiguedades: number;
  docentes: number;
  secciones: number;
  horarios: number;
  alumnosReales: number;
  matriculasReales: number;
  alumnosAnonimos: number;
  matriculasAnonimas: number;
  erroresImportadores: string[];
}

function trozos<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Cantidad de matrículas anónimas por sección base: lo declarado menos los alumnos reales. */
export function calcularAnonimos(datos: DatosPlantilla): Array<{
  codigoCurso: string;
  codigoSeccion: string;
  cantidad: number;
}> {
  const reales = new Map<string, number>();
  for (const m of datos.matriculas) {
    const k = `${m.codigoCurso}|${m.codigoSeccion}`;
    reales.set(k, (reales.get(k) ?? 0) + 1);
  }
  return datos.secciones
    .filter((s) => !s.codigoSeccion.endsWith(SUFIJO_LAB))
    .map((s) => ({
      codigoCurso: s.codigoCurso,
      codigoSeccion: s.codigoSeccion,
      cantidad: Math.max(
        0,
        s.matriculados - (reales.get(`${s.codigoCurso}|${s.codigoSeccion}`) ?? 0),
      ),
    }));
}

export async function cargarPlantilla(
  prisma: PrismaClient,
  datos: DatosPlantilla,
  log: (mensaje: string) => void = () => undefined,
): Promise<ResumenCarga> {
  const erroresImportadores: string[] = [];

  log('[1/6] Espacios y contigüidades...');
  const resEspacios = await sembrarEspaciosYContiguedades(prisma, datos.espacios, datos.contiguos);

  log('[2/6] Docentes...');
  const resDocentes = await importarDocentes(datos.docentes, prisma);
  erroresImportadores.push(...resDocentes.errores);

  log('[3/6] Cursos, secciones y horarios...');
  const resCursos = await importarCursosYSecciones(
    datos.secciones.map(({ codigoDocente: _d, matriculados: _m, ...s }) => s),
    prisma,
  );
  erroresImportadores.push(...resCursos.errores);
  const resHorarios = await importarHorarios(datos.horarios, prisma);
  erroresImportadores.push(...resHorarios.errores);

  // Mapa de secciones y vínculo con los docentes (una consulta por docente)
  const seccionesDb = await prisma.seccion.findMany({
    where: { curso: { codigo: { in: [...new Set(datos.secciones.map((s) => s.codigoCurso))] } } },
    select: { id: true, codigoSeccion: true, periodo: true, curso: { select: { codigo: true } } },
  });
  const idSeccion = new Map(
    seccionesDb.map((s) => [`${s.curso.codigo}|${s.codigoSeccion}|${s.periodo}`, s.id]),
  );
  const docentesDb = await prisma.docente.findMany({
    where: { codigoDocente: { in: datos.docentes.map((d) => d.codigoDocente) } },
    select: { id: true, codigoDocente: true },
  });
  const idDocente = new Map(docentesDb.map((d) => [d.codigoDocente, d.id]));
  const porDocente = new Map<string, string[]>();
  for (const s of datos.secciones) {
    const sid = idSeccion.get(`${s.codigoCurso}|${s.codigoSeccion}|${s.periodo}`);
    const did = s.codigoDocente ? idDocente.get(s.codigoDocente) : undefined;
    if (sid && did) porDocente.set(did, [...(porDocente.get(did) ?? []), sid]);
  }
  for (const [docenteId, ids] of porDocente) {
    await prisma.seccion.updateMany({ where: { id: { in: ids } }, data: { docenteId } });
  }
  log('      Docentes vinculados a sus secciones');

  log('[4/6] Alumnos reales y sus matrículas...');
  const alumnoPorCodigo = new Map(datos.alumnos.map((a) => [a.codigoAlumno, a]));
  const resMatriculas = await importarMatriculas(
    datos.matriculas.map((m) => {
      const a = alumnoPorCodigo.get(m.codigoAlumno)!;
      return {
        codigoAlumno: a.codigoAlumno,
        nombre: a.nombre,
        correo: a.correo,
        movilidadReducida: a.movilidadReducida,
        codigoCurso: m.codigoCurso,
        codigoSeccion: m.codigoSeccion,
        periodo: m.periodo,
        crearCuentaAcceso: true,
      } satisfies z.input<typeof MatriculaSchema>;
    }),
    prisma,
  );
  erroresImportadores.push(...resMatriculas.errores);
  for (const a of datos.alumnos.filter((x) => x.telefono)) {
    await prisma.alumno.updateMany({
      where: { codigo: a.codigoAlumno },
      data: { telefono: a.telefono },
    });
  }

  log('[5/6] Matrículas anónimas (solo aportan la demanda de cada sección)...');
  // Se rehacen en cada corrida para que el total siga igual a 'matriculados' si cambian los reales.
  await prisma.matricula.deleteMany({
    where: { alumno: { codigo: { startsWith: PREFIJO_ALUMNO_ANONIMO } } },
  });
  const anonimos: Array<{ codigo: string; nombre: string; correo: string }> = [];
  const enrolar: Array<{ codigo: string; seccionIds: string[] }> = [];
  for (const g of calcularAnonimos(datos)) {
    const periodo = datos.secciones.find(
      (s) => s.codigoCurso === g.codigoCurso && s.codigoSeccion === g.codigoSeccion,
    )!.periodo;
    const ids = [
      idSeccion.get(`${g.codigoCurso}|${g.codigoSeccion}|${periodo}`),
      idSeccion.get(`${g.codigoCurso}|${g.codigoSeccion}${SUFIJO_LAB}|${periodo}`),
    ].filter((x): x is string => Boolean(x));
    for (let i = 1; i <= g.cantidad; i++) {
      const codigo = `${PREFIJO_ALUMNO_ANONIMO}${g.codigoCurso}-${g.codigoSeccion}-${String(i).padStart(3, '0')}`;
      anonimos.push({
        codigo,
        nombre: `Alumno anónimo ${i} (${g.codigoCurso} sección ${g.codigoSeccion})`,
        correo: `anonimo.${g.codigoCurso}.${g.codigoSeccion}.${i}@demo.saie.pe`.toLowerCase(),
      });
      enrolar.push({ codigo, seccionIds: ids });
    }
  }
  for (const parte of trozos(anonimos, 1000)) {
    await prisma.alumno.createMany({ data: parte, skipDuplicates: true });
  }
  const alumnosAnon = await prisma.alumno.findMany({
    where: { codigo: { startsWith: PREFIJO_ALUMNO_ANONIMO } },
    select: { id: true, codigo: true },
  });
  const idAlumno = new Map(alumnosAnon.map((a) => [a.codigo, a.id]));
  const filasMatricula = enrolar.flatMap((e) =>
    e.seccionIds.map((seccionId) => ({
      alumnoId: idAlumno.get(e.codigo)!,
      seccionId,
      movilidadReducida: false,
    })),
  );
  for (const parte of trozos(filasMatricula, 1000)) {
    await prisma.matricula.createMany({ data: parte, skipDuplicates: true });
  }

  log('[6/6] Carga terminada.');
  return {
    espacios: resEspacios.espaciosSembrados,
    contiguedades: resEspacios.contiguedadesSembradas,
    docentes: resDocentes.docentesProcesados,
    secciones: resCursos.seccionesProcesadas,
    horarios: resHorarios.horariosProcesados,
    alumnosReales: new Set(datos.matriculas.map((m) => m.codigoAlumno)).size,
    matriculasReales: resMatriculas.matriculasProcesadas,
    alumnosAnonimos: anonimos.length,
    matriculasAnonimas: filasMatricula.length,
    erroresImportadores,
  };
}
