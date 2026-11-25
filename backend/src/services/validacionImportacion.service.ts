import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { CursoSeccionSchema } from '../importers/cursosSecciones.importer';
import { DocenteSchema } from '../importers/docentes.importer';
import { HorarioSchema } from '../importers/horarios.importer';
import { MatriculaSchema } from '../importers/matriculas.importer';
import { haySolapamientoHorario, HorarioSlot } from './disponibilidad.service';
import { resolverSoftwarePorNombre } from './software.service';
import { TipoImportacion } from '../types/importacion';

type Db = Pick<PrismaClient, 'curso' | 'seccion' | 'software' | 'periodo'>;

export interface ValidacionImportacion {
  /** Una entrada por fila con problemas. Si hay al menos una, no se guarda ninguna fila. */
  errores: string[];
  /** Avisos que no impiden guardar (por ejemplo, un docente con dos clases a la misma hora). */
  advertencias: string[];
}

interface FilaValida<T> {
  fila: number;
  datos: T;
}

/** Valida cada fila contra el esquema del importador; devuelve las válidas y los errores. */
function validarEsquema<T>(
  filas: unknown[],
  esquema: { safeParse: (v: unknown) => z.ZodSafeParseResult<T> },
  errores: string[],
): FilaValida<T>[] {
  const validas: FilaValida<T>[] = [];
  filas.forEach((f, i) => {
    const r = esquema.safeParse(f);
    if (r.success) validas.push({ fila: i + 1, datos: r.data });
    else errores.push(`Fila ${i + 1}: ${r.error.issues.map((e) => e.message).join(', ')}`);
  });
  return validas;
}

/** Marca como error las filas que repiten la clave de una fila anterior del mismo archivo. */
function marcarRepetidas<T>(
  validas: FilaValida<T>[],
  clave: (d: T) => string,
  describir: (d: T) => string,
  errores: string[],
): void {
  const vistas = new Map<string, number>();
  for (const v of validas) {
    const k = clave(v.datos);
    const anterior = vistas.get(k);
    if (anterior !== undefined) {
      errores.push(
        `Fila ${v.fila}: ${describir(v.datos)} se repite (ya aparece en la fila ${anterior})`,
      );
    } else {
      vistas.set(k, v.fila);
    }
  }
}

const claveSeccion = (codigoCurso: string, codigoSeccion: string, periodo: string) =>
  `${codigoCurso}|${codigoSeccion}|${periodo}`;

/**
 * Issue 4.64 (riesgos R49 y R50): solo se carga en periodos registrados y no cerrados. Así un error
 * al escribir el periodo en el CSV no crea uno nuevo ni toca uno que ya terminó.
 */
async function validarPeriodos(
  validas: FilaValida<{ periodo: string }>[],
  db: Db,
  errores: string[],
): Promise<void> {
  const codigos = [...new Set(validas.map((v) => v.datos.periodo))];
  if (codigos.length === 0) return;
  const registrados = await db.periodo.findMany({
    where: { codigo: { in: codigos } },
    select: { codigo: true, estado: true },
  });
  const estados = new Map(registrados.map((p) => [p.codigo, p.estado]));
  for (const v of validas) {
    const estado = estados.get(v.datos.periodo);
    if (!estado) {
      errores.push(
        `Fila ${v.fila}: El periodo ${v.datos.periodo} no está registrado. Regístralo primero en Periodos`,
      );
    } else if (estado === 'CERRADO') {
      errores.push(
        `Fila ${v.fila}: El periodo ${v.datos.periodo} está cerrado y solo admite consulta`,
      );
    }
  }
}

/** Carga en una sola consulta las secciones que el archivo referencia, por curso+sección+periodo. */
async function cargarSeccionesReferidas(
  refs: { codigoCurso: string; codigoSeccion: string; periodo: string }[],
  db: Db,
): Promise<Map<string, SeccionReferida>> {
  const codigos = [...new Set(refs.map((r) => r.codigoCurso))];
  const periodos = [...new Set(refs.map((r) => r.periodo))];
  if (codigos.length === 0) return new Map<string, SeccionReferida>();

  const secciones = await db.seccion.findMany({
    where: { curso: { codigo: { in: codigos } }, periodo: { in: periodos } },
    select: {
      id: true,
      codigoSeccion: true,
      periodo: true,
      docenteId: true,
      curso: { select: { codigo: true } },
      horarios: { select: { diaSemana: true, horaInicio: true, horaFin: true } },
    },
  });
  return new Map(
    secciones.map((s) => [claveSeccion(s.curso.codigo, s.codigoSeccion, s.periodo), s]),
  );
}

interface SeccionReferida {
  id: string;
  codigoSeccion: string;
  periodo: string;
  docenteId: string | null;
  curso: { codigo: string };
  horarios: HorarioSlot[];
}

function errorSeccionInexistente(
  fila: number,
  d: { codigoCurso: string; codigoSeccion: string; periodo: string },
): string {
  return `Fila ${fila}: No existe la sección ${d.codigoSeccion} para el curso ${d.codigoCurso} en el periodo ${d.periodo}`;
}

const texto = (h: HorarioSlot) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`;

async function validarHorarios(filas: unknown[], db: Db, r: ValidacionImportacion): Promise<void> {
  const validas = validarEsquema(filas, HorarioSchema, r.errores).filter((v) => {
    // Misma regla y mensaje que el importador: el inicio debe ser anterior al fin.
    if (v.datos.horaInicio < v.datos.horaFin) return true;
    r.errores.push(
      `Fila ${v.fila}: La hora de inicio (${v.datos.horaInicio}) debe ser menor a la hora de fin (${v.datos.horaFin})`,
    );
    return false;
  });
  marcarRepetidas(
    validas,
    (d) =>
      `${claveSeccion(d.codigoCurso, d.codigoSeccion, d.periodo)}|${d.diaSemana}|${d.horaInicio}`,
    (d) => `la franja ${d.diaSemana} ${d.horaInicio} de ${d.codigoCurso}-${d.codigoSeccion}`,
    r.errores,
  );

  await validarPeriodos(validas, db, r.errores);
  const secciones = await cargarSeccionesReferidas(
    validas.map((v) => v.datos),
    db,
  );
  for (const v of validas) {
    const k = claveSeccion(v.datos.codigoCurso, v.datos.codigoSeccion, v.datos.periodo);
    if (!secciones.has(k)) r.errores.push(errorSeccionInexistente(v.fila, v.datos));
  }

  avisarChoquesDeDocentes(validas, secciones, r);
}

/** Riesgo R36: avisa si un docente quedaría con dos clases a la vez. */
function avisarChoquesDeDocentes(
  validas: FilaValida<z.output<typeof HorarioSchema>>[],
  secciones: Map<string, SeccionReferida>,
  r: ValidacionImportacion,
): void {
  // Se cruzan las franjas del
  // archivo con las que ya están en la base para las secciones que el archivo no incluye.
  const franjasPorDocente = new Map<string, { seccion: string; horario: HorarioSlot }[]>();
  const enArchivo = new Set<string>();
  for (const v of validas) {
    const k = claveSeccion(v.datos.codigoCurso, v.datos.codigoSeccion, v.datos.periodo);
    const s = secciones.get(k);
    if (!s?.docenteId) continue;
    enArchivo.add(k);
    const lista = franjasPorDocente.get(s.docenteId) ?? [];
    lista.push({ seccion: `${v.datos.codigoCurso}-${v.datos.codigoSeccion}`, horario: v.datos });
    franjasPorDocente.set(s.docenteId, lista);
  }
  for (const [k, s] of secciones) {
    if (!s.docenteId || enArchivo.has(k) || !franjasPorDocente.has(s.docenteId)) continue;
    for (const h of s.horarios) {
      franjasPorDocente
        .get(s.docenteId)!
        .push({ seccion: `${s.curso.codigo}-${s.codigoSeccion}`, horario: h });
    }
  }
  const avisados = new Set<string>();
  for (const franjas of franjasPorDocente.values()) {
    for (let i = 0; i < franjas.length; i++) {
      for (let j = i + 1; j < franjas.length; j++) {
        const a = franjas[i];
        const b = franjas[j];
        if (a.seccion === b.seccion || !haySolapamientoHorario(a.horario, b.horario)) continue;
        const aviso = `El docente de ${a.seccion} y ${b.seccion} tendría dos clases a la vez (${texto(a.horario)} y ${texto(b.horario)})`;
        if (!avisados.has(aviso)) {
          avisados.add(aviso);
          r.advertencias.push(aviso);
        }
      }
    }
  }
}

async function validarMatriculas(
  filas: unknown[],
  db: Db,
  r: ValidacionImportacion,
): Promise<void> {
  const validas = validarEsquema(filas, MatriculaSchema, r.errores);
  marcarRepetidas(
    validas,
    (d) => `${d.codigoAlumno}|${claveSeccion(d.codigoCurso, d.codigoSeccion, d.periodo)}`,
    (d) => `la matrícula de ${d.codigoAlumno} en ${d.codigoCurso}-${d.codigoSeccion}`,
    r.errores,
  );

  await validarPeriodos(validas, db, r.errores);
  const secciones = await cargarSeccionesReferidas(
    validas.map((v) => v.datos),
    db,
  );
  const seccionesPorAlumno = new Map<string, string[]>();
  for (const v of validas) {
    const k = claveSeccion(v.datos.codigoCurso, v.datos.codigoSeccion, v.datos.periodo);
    if (!secciones.has(k)) {
      r.errores.push(errorSeccionInexistente(v.fila, v.datos));
      continue;
    }
    const lista = seccionesPorAlumno.get(v.datos.codigoAlumno) ?? [];
    lista.push(k);
    seccionesPorAlumno.set(v.datos.codigoAlumno, lista);
  }

  // Riesgo R36: avisar si un alumno quedaría matriculado en dos clases a la vez.
  for (const [alumno, claves] of seccionesPorAlumno) {
    for (let i = 0; i < claves.length; i++) {
      for (let j = i + 1; j < claves.length; j++) {
        const a = secciones.get(claves[i])!;
        const b = secciones.get(claves[j])!;
        const choque = a.horarios.find((ha) =>
          b.horarios.some((hb) => haySolapamientoHorario(ha, hb)),
        );
        if (choque) {
          r.advertencias.push(
            `El alumno ${alumno} tendría dos clases a la vez: ${a.curso.codigo}-${a.codigoSeccion} y ${b.curso.codigo}-${b.codigoSeccion} (${texto(choque)})`,
          );
        }
      }
    }
  }
}

async function validarCursosSecciones(
  filas: unknown[],
  db: Db,
  r: ValidacionImportacion,
): Promise<void> {
  const validas = validarEsquema(filas, CursoSeccionSchema, r.errores);
  marcarRepetidas(
    validas,
    (d) => claveSeccion(d.codigoCurso, d.codigoSeccion, d.periodo),
    (d) => `la sección ${d.codigoCurso}-${d.codigoSeccion} (${d.periodo})`,
    r.errores,
  );

  await validarPeriodos(validas, db, r.errores);

  // Software requerido: se resuelve cada nombre una sola vez contra el catálogo.
  const resueltos = new Map<string, boolean>();
  for (const v of validas) {
    if (v.datos.tipoEspacioRequerido !== 'LABORATORIO') continue;
    const faltan: string[] = [];
    for (const nombre of v.datos.stackSoftwareRequerido) {
      if (!resueltos.has(nombre)) {
        resueltos.set(nombre, Boolean(await resolverSoftwarePorNombre(nombre, undefined, db)));
      }
      if (!resueltos.get(nombre)) faltan.push(nombre);
    }
    if (faltan.length > 0) {
      r.errores.push(
        `Fila ${v.fila} (${v.datos.codigoCurso}-${v.datos.codigoSeccion}): SOFTWARE_NO_REGISTRADO ${faltan.join(', ')}`,
      );
    }
  }
}

function validarDocentes(filas: unknown[], r: ValidacionImportacion): void {
  const validas = validarEsquema(filas, DocenteSchema, r.errores);
  marcarRepetidas(
    validas,
    (d) => d.codigoDocente,
    (d) => `el docente ${d.codigoDocente}`,
    r.errores,
  );
}

export const MENSAJE_CARACTERES_DANADOS =
  'El archivo tiene caracteres dañados: guárdalo como CSV UTF-8 en Excel';

/**
 * Issue 1.18 (riesgo R38): un CSV leído con la codificación equivocada trae «�» en lugar de las
 * tildes y la ñ, y no se puede reparar después. Ninguna fila con ese carácter llega a la base.
 */
function marcarCaracteresDanados(filas: unknown[], errores: string[]): void {
  filas.forEach((f, i) => {
    const dañada =
      f !== null &&
      typeof f === 'object' &&
      Object.values(f).some((v) => typeof v === 'string' && v.includes('�'));
    if (dañada) errores.push(`Fila ${i + 1}: ${MENSAJE_CARACTERES_DANADOS}`);
  });
}

/**
 * Issue 1.16 (riesgos R34 y R36 de la auditoría): valida el archivo completo ANTES de escribir en
 * la base. Si hay al menos un error, la importación no guarda ninguna fila: así un CSV con una
 * fila mala no deja la base a medias. Las referencias a la base (secciones, software) se
 * resuelven en consultas agrupadas, no fila por fila.
 */
export async function validarImportacion(
  tipo: TipoImportacion,
  filas: unknown[],
  db: Db,
): Promise<ValidacionImportacion> {
  const r: ValidacionImportacion = { errores: [], advertencias: [] };
  marcarCaracteresDanados(filas, r.errores);
  switch (tipo) {
    case 'cursos-secciones':
      await validarCursosSecciones(filas, db, r);
      break;
    case 'horarios':
      await validarHorarios(filas, db, r);
      break;
    case 'matriculas':
      await validarMatriculas(filas, db, r);
      break;
    case 'docentes':
      validarDocentes(filas, r);
      break;
  }
  r.errores.sort((a, b) => numeroDeFila(a) - numeroDeFila(b));
  return r;
}

function numeroDeFila(error: string): number {
  const m = /^Fila (\d+)/.exec(error);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}
