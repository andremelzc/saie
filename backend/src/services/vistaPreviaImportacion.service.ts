import { PrismaClient } from '@prisma/client';
import { CursoSeccionSchema, DocenteSchema, HorarioSchema, MatriculaSchema } from '../importers';
import { TipoImportacion, VistaPreviaImportacionDTO } from '../types/importacion';
import { validarImportacion } from './validacionImportacion.service';

/**
 * Issue 1.17 (riesgo R35): vista previa de una importación. Calcula, sin escribir nada, lo que el
 * importador haría con el mismo archivo: qué se agrega, qué se quita (retiros, franjas que
 * cambiaron) y qué secciones quedan inactivas. Usa los mismos esquemas y las mismas claves que los
 * importadores, para que la vista previa coincida con lo que finalmente se guarda.
 */

type Db = PrismaClient;

interface Cambios {
  cambios: Record<string, number>;
  frases: string[];
  retiros: string[];
}

function plural(n: number, singular: string, varias: string): string {
  return `${n} ${n === 1 ? singular : varias}`;
}

/** El verbo concuerda con la cantidad: «Se quitará 1 matrícula», «Se quitarán 3». */
function segun(n: number, singular: string, varias: string): string {
  return n === 1 ? singular : varias;
}

/** Junta las filas válidas de un esquema; las inválidas ya las informó la validación. */
function filasValidas<T>(
  filas: unknown[],
  esquema: { safeParse: (f: unknown) => { success: boolean; data?: T } },
): T[] {
  return filas
    .map((f) => esquema.safeParse(f))
    .filter((r): r is { success: true; data: T } => r.success)
    .map((r) => r.data);
}

const claveSeccion = (codigoCurso: string, codigoSeccion: string, periodo: string) =>
  `${codigoCurso}|${codigoSeccion}|${periodo}`;

/** Las secciones del archivo, con sus datos actuales, en una sola consulta. */
async function seccionesDelArchivo<I extends object>(
  claves: { codigoCurso: string; codigoSeccion: string; periodo: string }[],
  include: I,
  db: Db,
) {
  if (claves.length === 0) return [];
  return db.seccion.findMany({
    where: {
      OR: claves.map((c) => ({
        curso: { codigo: c.codigoCurso },
        codigoSeccion: c.codigoSeccion,
        periodo: c.periodo,
      })),
    },
    include: { curso: { select: { codigo: true } }, ...include },
  });
}

async function vistaMatriculas(filas: unknown[], db: Db): Promise<Cambios> {
  const datos = filasValidas(filas, MatriculaSchema);
  const porSeccion = new Map<
    string,
    { clave: Parameters<typeof claveSeccion>; alumnos: Set<string> }
  >();
  for (const d of datos) {
    const clave = claveSeccion(d.codigoCurso, d.codigoSeccion, d.periodo);
    const grupo = porSeccion.get(clave) ?? {
      clave: [d.codigoCurso, d.codigoSeccion, d.periodo] as Parameters<typeof claveSeccion>,
      alumnos: new Set<string>(),
    };
    grupo.alumnos.add(d.codigoAlumno);
    porSeccion.set(clave, grupo);
  }

  const secciones = await seccionesDelArchivo(
    [...porSeccion.values()].map(({ clave: [codigoCurso, codigoSeccion, periodo] }) => ({
      codigoCurso,
      codigoSeccion,
      periodo,
    })),
    { matriculas: { select: { alumno: { select: { codigo: true, nombre: true } } } } },
    db,
  );

  let nuevas = 0;
  let retiradas = 0;
  const retiros: string[] = [];
  for (const s of secciones) {
    const enArchivo = porSeccion.get(claveSeccion(s.curso.codigo, s.codigoSeccion, s.periodo));
    if (!enArchivo) continue;
    const actuales = new Set(s.matriculas.map((m) => m.alumno.codigo));
    for (const codigo of enArchivo.alumnos) if (!actuales.has(codigo)) nuevas++;
    for (const m of s.matriculas) {
      if (enArchivo.alumnos.has(m.alumno.codigo)) continue;
      retiradas++;
      retiros.push(
        `${s.curso.codigo} sec. ${s.codigoSeccion}: ${m.alumno.codigo} ${m.alumno.nombre}`,
      );
    }
  }

  const codigos = [...new Set(datos.map((d) => d.codigoAlumno))];
  const existentes =
    codigos.length === 0 ? 0 : await db.alumno.count({ where: { codigo: { in: codigos } } });
  const alumnosNuevos = codigos.length - existentes;

  return {
    cambios: { matriculasNuevas: nuevas, matriculasRetiradas: retiradas, alumnosNuevos },
    frases: [
      `${segun(nuevas, 'Se agregará', 'Se agregarán')} ${plural(nuevas, 'matrícula', 'matrículas')}`,
      `${segun(retiradas, 'Se quitará', 'Se quitarán')} ${plural(retiradas, 'matrícula', 'matrículas')} (alumnos que ya no figuran en su sección)`,
      ...(alumnosNuevos > 0
        ? [
            `${segun(alumnosNuevos, 'Se registrará', 'Se registrarán')} ${plural(alumnosNuevos, 'alumno nuevo', 'alumnos nuevos')}`,
          ]
        : []),
    ],
    retiros,
  };
}

async function vistaHorarios(filas: unknown[], db: Db): Promise<Cambios> {
  const datos = filasValidas(filas, HorarioSchema);
  const porSeccion = new Map<string, Map<string, string>>();
  const claves = new Map<string, { codigoCurso: string; codigoSeccion: string; periodo: string }>();
  for (const d of datos) {
    const clave = claveSeccion(d.codigoCurso, d.codigoSeccion, d.periodo);
    claves.set(clave, {
      codigoCurso: d.codigoCurso,
      codigoSeccion: d.codigoSeccion,
      periodo: d.periodo,
    });
    const franjas = porSeccion.get(clave) ?? new Map<string, string>();
    franjas.set(`${d.diaSemana}|${d.horaInicio}`, d.horaFin);
    porSeccion.set(clave, franjas);
  }

  const secciones = await seccionesDelArchivo([...claves.values()], { horarios: true }, db);

  let nuevos = 0;
  let actualizados = 0;
  let retirados = 0;
  const retiros: string[] = [];
  for (const s of secciones) {
    const enArchivo = porSeccion.get(claveSeccion(s.curso.codigo, s.codigoSeccion, s.periodo));
    if (!enArchivo) continue;
    const actuales = new Map(s.horarios.map((h) => [`${h.diaSemana}|${h.horaInicio}`, h.horaFin]));
    for (const [franja, horaFin] of enArchivo) {
      if (!actuales.has(franja)) nuevos++;
      else if (actuales.get(franja) !== horaFin) actualizados++;
    }
    for (const h of s.horarios) {
      if (enArchivo.has(`${h.diaSemana}|${h.horaInicio}`)) continue;
      retirados++;
      retiros.push(
        `${s.curso.codigo} sec. ${s.codigoSeccion}: ${h.diaSemana} ${h.horaInicio}-${h.horaFin}`,
      );
    }
  }

  return {
    cambios: {
      horariosNuevos: nuevos,
      horariosActualizados: actualizados,
      horariosRetirados: retirados,
    },
    frases: [
      `${segun(nuevos, 'Se agregará', 'Se agregarán')} ${plural(nuevos, 'franja', 'franjas')} de horario`,
      ...(actualizados > 0
        ? [`Se cambiará la hora de fin de ${plural(actualizados, 'franja', 'franjas')}`]
        : []),
      `${segun(retirados, 'Se quitará', 'Se quitarán')} ${plural(retirados, 'franja', 'franjas')} ${segun(retirados, 'que ya no figura', 'que ya no figuran')} (cambios de horario)`,
    ],
    retiros,
  };
}

async function vistaCursosSecciones(filas: unknown[], db: Db): Promise<Cambios> {
  const datos = filasValidas(filas, CursoSeccionSchema);
  // Como el importador: el archivo manda sobre las secciones de cada curso y periodo que trae.
  const porCurso = new Map<string, Set<string>>();
  for (const d of datos) {
    const clave = `${d.codigoCurso}|${d.periodo}`;
    const secciones = porCurso.get(clave) ?? new Set<string>();
    secciones.add(d.codigoSeccion);
    porCurso.set(clave, secciones);
  }

  const codigos = [...new Set(datos.map((d) => d.codigoCurso))];
  const periodos = [...new Set(datos.map((d) => d.periodo))];
  const cursos =
    codigos.length === 0
      ? []
      : await db.curso.findMany({
          where: { codigo: { in: codigos } },
          include: {
            secciones: {
              where: { periodo: { in: periodos } },
              select: { codigoSeccion: true, periodo: true, activa: true },
            },
          },
        });
  const existentes = new Map(cursos.map((c) => [c.codigo, c]));

  let nuevas = 0;
  let reactivadas = 0;
  let inactivadas = 0;
  const retiros: string[] = [];
  for (const [clave, enArchivo] of porCurso) {
    const [codigoCurso, periodo] = clave.split('|');
    const actuales = (existentes.get(codigoCurso)?.secciones ?? []).filter(
      (s) => s.periodo === periodo,
    );
    const porCodigo = new Map(actuales.map((s) => [s.codigoSeccion, s]));
    for (const codigo of enArchivo) {
      const actual = porCodigo.get(codigo);
      if (!actual) nuevas++;
      else if (!actual.activa) reactivadas++;
    }
    for (const s of actuales) {
      if (!s.activa || enArchivo.has(s.codigoSeccion)) continue;
      inactivadas++;
      retiros.push(
        `${codigoCurso} sec. ${s.codigoSeccion} (${periodo}): pasará a inactiva y liberará su aula`,
      );
    }
  }
  const cursosNuevos = codigos.filter((c) => !existentes.has(c)).length;

  return {
    cambios: {
      cursosNuevos,
      seccionesNuevas: nuevas,
      seccionesReactivadas: reactivadas,
      seccionesInactivadas: inactivadas,
    },
    frases: [
      ...(cursosNuevos > 0
        ? [
            `${segun(cursosNuevos, 'Se creará', 'Se crearán')} ${plural(cursosNuevos, 'curso', 'cursos')}`,
          ]
        : []),
      `${segun(nuevas, 'Se agregará', 'Se agregarán')} ${plural(nuevas, 'sección', 'secciones')}`,
      ...(reactivadas > 0
        ? [
            `${segun(reactivadas, 'Se volverá', 'Se volverán')} a activar ${plural(reactivadas, 'sección', 'secciones')}`,
          ]
        : []),
      `${segun(inactivadas, 'Se marcará inactiva', 'Se marcarán inactivas')} ${plural(inactivadas, 'sección', 'secciones')} ${segun(inactivadas, 'que ya no figura', 'que ya no figuran')} en su curso`,
    ],
    retiros,
  };
}

async function vistaDocentes(filas: unknown[], db: Db): Promise<Cambios> {
  const codigos = [...new Set(filasValidas(filas, DocenteSchema).map((d) => d.codigoDocente))];
  const existentes =
    codigos.length === 0
      ? 0
      : await db.docente.count({ where: { codigoDocente: { in: codigos } } });
  const nuevos = codigos.length - existentes;
  return {
    cambios: { docentesNuevos: nuevos, docentesActualizados: existentes },
    frases: [
      `${segun(nuevos, 'Se registrará', 'Se registrarán')} ${plural(nuevos, 'docente nuevo', 'docentes nuevos')}`,
      `Se actualizarán los datos de ${plural(existentes, 'docente', 'docentes')}`,
    ],
    retiros: [],
  };
}

export async function calcularVistaPrevia(
  tipo: TipoImportacion,
  filas: unknown[],
  db: Db,
): Promise<VistaPreviaImportacionDTO> {
  const validacion = await validarImportacion(tipo, filas, db);
  const base: VistaPreviaImportacionDTO = {
    tipo,
    filasRecibidas: filas.length,
    errores: validacion.errores,
    advertencias: validacion.advertencias,
    cambios: {},
    frases: [],
    retiros: [],
  };
  // Con errores la importación no guarda nada (Issue 1.16): no hay cambios que mostrar.
  if (validacion.errores.length > 0) return base;

  const calculo =
    tipo === 'matriculas'
      ? await vistaMatriculas(filas, db)
      : tipo === 'horarios'
        ? await vistaHorarios(filas, db)
        : tipo === 'cursos-secciones'
          ? await vistaCursosSecciones(filas, db)
          : await vistaDocentes(filas, db);
  return { ...base, ...calculo };
}
