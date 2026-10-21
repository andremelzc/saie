/**
 * exportar-csv.ts — vuelca la base de datos a archivos CSV.
 *
 * Hay dos familias de archivos:
 *
 *  1. **Los que se pueden volver a subir** (`01` a `05`): llevan los encabezados exactos que
 *     espera cada importador, así que sirven de respaldo del estado actual y de base para
 *     preparar el siguiente periodo.
 *  2. **Los de diagnóstico** (`06` y `fallos-*`): dicen qué asignó el motor, qué secciones
 *     quedaron sin aula, qué laboratorios no tienen el software que exigen las secciones y
 *     qué dejó registrado la auditoría.
 *
 * Uso:
 *   npm run prisma:export                → escribe en backend/prisma/export/
 *   EXPORT_DIR=ruta npm run prisma:export → escribe en otra carpeta
 *   EXPORT_PERIODO=2026-2 npm run prisma:export → solo ese periodo
 *
 * Los archivos se escriben con BOM y punto y coma: es lo que Excel en español abre sin
 * romper los acentos ni convertir los códigos en fechas.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient, EstadoAsignacion, TipoEspacio } from '@prisma/client';

const prisma = new PrismaClient();

const DIRECTORIO = path.resolve(
  process.env.EXPORT_DIR
    ? path.resolve(process.env.EXPORT_DIR)
    : path.resolve(__dirname, 'export'),
);

const PERIODO = process.env.EXPORT_PERIODO?.trim() || undefined;

const BOM = '\uFEFF';
const SEPARADOR = ';';

/** Escapa un valor para CSV: entrecomilla si trae separador, comilla o salto de línea. */
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (!/[;"\n\r]/.test(texto)) return texto;
  return `"${texto.replaceAll('"', '""')}"`;
}

function escribir(nombre: string, encabezados: string[], filas: unknown[][]): void {
  const contenido = [
    encabezados.map(celda).join(SEPARADOR),
    ...filas.map((fila) => fila.map(celda).join(SEPARADOR)),
  ].join('\n');
  fs.writeFileSync(path.join(DIRECTORIO, nombre), `${BOM}${contenido}\n`, 'utf8');
  console.log(`  ✅ ${nombre} (${filas.length} filas)`);
}

/** Une una lista con un separador legible dentro de una celda. */
const lista = (valores: string[]): string => (valores.length > 0 ? valores.join(' | ') : '');

async function exportar() {
  fs.mkdirSync(DIRECTORIO, { recursive: true });
  console.log('📄 SAIE · Exportación a CSV');
  console.log('=========================================');
  console.log(`Directorio: ${DIRECTORIO}`);
  console.log(`Periodo: ${PERIODO ?? 'todos'}`);
  console.log('');

  // ── 01 · Espacios ───────────────────────────────────────────────────────────
  const espacios = await prisma.espacio.findMany({
    include: {
      softwareInstaladoCatalogo: { include: { software: true } },
      espaciosContiguosA: { include: { espacioB: true } },
    },
    orderBy: [{ pabellon: 'asc' }, { piso: 'asc' }, { identificador: 'asc' }],
  });

  escribir(
    '01-espacios.csv',
    [
      'identificador',
      'pabellon',
      'piso',
      'tipo',
      'aforoNominal',
      'pcsMalogradas',
      'habilitado',
      'descripcionUso',
      'distanciaAscensor',
      'softwareInstalado',
      'contiguos',
    ],
    espacios.map((e) => [
      e.identificador,
      e.pabellon,
      e.piso,
      e.tipo,
      e.aforoNominal,
      e.pcsMalogradas,
      e.habilitado ? 'sí' : 'no',
      e.descripcionUso,
      e.distanciaAscensor,
      lista(
        e.softwareInstaladoCatalogo
          .map((f) => `${f.software.nombre}${f.software.version ? ` ${f.software.version}` : ''}`)
          .sort(),
      ),
      lista(e.espaciosContiguosA.map((c) => c.espacioB.identificador).sort()),
    ]),
  );

  // ── 02 · Cursos y secciones (encabezado del importador) ─────────────────────
  const secciones = await prisma.seccion.findMany({
    where: PERIODO ? { periodo: PERIODO } : undefined,
    include: {
      curso: true,
      softwareRequerido: { include: { software: true } },
    },
    orderBy: [{ periodo: 'desc' }, { curso: { codigo: 'asc' } }, { codigoSeccion: 'asc' }],
  });

  escribir(
    '02-cursos-secciones.csv',
    [
      'codigoCurso',
      'nombreCurso',
      'codigoSeccion',
      'periodo',
      'tipoEspacioRequerido',
      'stackSoftwareRequerido',
    ],
    secciones.map((s) => [
      s.curso.codigo,
      s.curso.nombre,
      s.codigoSeccion,
      s.periodo,
      s.tipoEspacioRequerido,
      lista(
        s.softwareRequerido
          .map((f) => `${f.software.nombre}${f.software.version ? ` ${f.software.version}` : ''}`)
          .sort(),
      ),
    ]),
  );

  // ── 03 · Horarios (encabezado del importador) ──────────────────────────────
  const horarios = await prisma.horario.findMany({
    where: PERIODO ? { seccion: { periodo: PERIODO } } : undefined,
    include: { seccion: { include: { curso: true } } },
    orderBy: [{ seccion: { curso: { codigo: 'asc' } } }, { seccionId: 'asc' }],
  });

  escribir(
    '03-horarios.csv',
    ['codigoCurso', 'codigoSeccion', 'periodo', 'diaSemana', 'horaInicio', 'horaFin'],
    horarios.map((h) => [
      h.seccion.curso.codigo,
      h.seccion.codigoSeccion,
      h.seccion.periodo,
      h.diaSemana,
      h.horaInicio,
      h.horaFin,
    ]),
  );

  // ── 04 · Matrículas (encabezado del importador) ────────────────────────────
  const matriculas = await prisma.matricula.findMany({
    where: PERIODO ? { seccion: { periodo: PERIODO } } : undefined,
    include: { alumno: true, seccion: { include: { curso: true } } },
    orderBy: [{ seccion: { curso: { codigo: 'asc' } } }, { alumnoId: 'asc' }],
  });

  escribir(
    '04-matriculas.csv',
    [
      'codigoAlumno',
      'nombre',
      'correo',
      'movilidadReducida',
      'codigoCurso',
      'codigoSeccion',
      'periodo',
      'crearCuentaAcceso',
    ],
    matriculas.map((m) => [
      m.alumno.codigo,
      m.alumno.nombre,
      m.alumno.correo,
      m.movilidadReducida ? 'sí' : 'no',
      m.seccion.curso.codigo,
      m.seccion.codigoSeccion,
      m.seccion.periodo,
      m.alumno.cuentaId ? 'no' : 'sí',
    ]),
  );

  // ── 05 · Docentes (encabezado del importador) ──────────────────────────────
  const docentes = await prisma.docente.findMany({
    orderBy: { nombre: 'asc' },
  });

  escribir(
    '05-docentes.csv',
    ['codigoDocente', 'nombre', 'correoInstitucional', 'departamento'],
    docentes.map((d) => [d.codigoDocente, d.nombre, d.correoInstitucional, d.departamento]),
  );

  // ── 06 · Asignaciones vigentes ──────────────────────────────────────────────
  const asignaciones = await prisma.asignacion.findMany({
    where: {
      estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
      ...(PERIODO ? { seccion: { periodo: PERIODO } } : {}),
    },
    include: {
      seccion: {
        include: {
          curso: true,
          docente: true,
          softwareRequerido: { include: { software: true } },
          _count: { select: { matriculas: true } },
        },
      },
      espacios: { include: { espacio: true } },
    },
    orderBy: [{ seccion: { curso: { codigo: 'asc' } } }, { seccionId: 'asc' }],
  });

  escribir(
    '06-asignaciones.csv',
    [
      'codigoCurso',
      'codigoSeccion',
      'periodo',
      'estado',
      'aulas',
      'pabellon',
      'piso',
      'alumnosMatriculados',
      'fechaAsignacion',
      'corridaId',
      'motivoEscalamiento',
    ],
    asignaciones.map((a) => [
      a.seccion.curso.codigo,
      a.seccion.codigoSeccion,
      a.seccion.periodo,
      a.estado,
      lista(a.espacios.map((e) => e.espacio.identificador)),
      lista([...new Set(a.espacios.map((e) => e.espacio.pabellon))]),
      lista([...new Set(a.espacios.map((e) => e.espacio.piso))].map(String)),
      a.seccion._count?.matriculas ?? '',
      a.fechaAsignacion.toISOString(),
      a.corridaId,
      a.motivoEscalamiento,
    ]),
  );

  // ── fallos-01 · Secciones que el motor no pudo asignar ─────────────────────
  const escaladas = asignaciones.filter((a) => a.estado === EstadoAsignacion.ESCALADA);

  escribir(
    'fallos-01-asignacion.csv',
    [
      'codigoCurso',
      'codigoSeccion',
      'curso',
      'periodo',
      'motivoCodigo',
      'motivo',
      'tipoEspacioRequerido',
      'alumnosMatriculados',
      'docente',
      'softwareRequerido',
      'fechaEscalamiento',
    ],
    escaladas.map((a) => {
      const codigo = a.motivoEscalamiento?.match(/^\[([A-Z0-9_]+)\]/)?.[1] ?? '';
      const descripcion = a.motivoEscalamiento?.replace(/^\[[A-Z0-9_]+\]\s*/, '') ?? '';
      return [
        a.seccion.curso.codigo,
        a.seccion.codigoSeccion,
        a.seccion.curso.nombre,
        a.seccion.periodo,
        codigo,
        descripcion,
        a.seccion.tipoEspacioRequerido,
        a.seccion._count?.matriculas ?? '',
        a.seccion.docente?.nombre ?? '',
        lista(
          a.seccion.softwareRequerido.map(
            (f) => `${f.software.nombre}${f.software.version ? ` ${f.software.version}` : ''}`,
          ),
        ),
        a.fechaAsignacion.toISOString(),
      ];
    }),
  );

  // ── fallos-02 · Laboratorios sin el software que exigen las secciones ──────
  const seccionesConSoftware = await prisma.seccion.findMany({
    where: PERIODO ? { periodo: PERIODO } : undefined,
    include: {
      curso: true,
      softwareRequerido: { include: { software: true } },
      asignaciones: {
        where: { estado: EstadoAsignacion.VIGENTE },
        include: { espacios: { include: { espacio: true } } },
      },
    },
  });

  // El software instalado de cada laboratorio se lee una sola vez, no una por sección.
  const espaciosLab = [
    ...new Set(
      seccionesConSoftware.flatMap((s) =>
        s.asignaciones.flatMap((a) =>
          a.espacios.filter((ae) => ae.espacio.tipo === TipoEspacio.LABORATORIO).map((ae) => ae.espacio.id),
        ),
      ),
    ),
  ];
  const instaladosPorEspacio = new Map<string, Set<string>>();
  if (espaciosLab.length > 0) {
    const instalados = await prisma.espacioSoftware.findMany({
      where: { espacioId: { in: espaciosLab } },
      include: { software: true },
    });
    for (const fila of instalados) {
      const clave = `${fila.software.nombreNormalizado} ${fila.software.version}`.trim();
      const conjunto = instaladosPorEspacio.get(fila.espacioId) ?? new Set<string>();
      conjunto.add(clave);
      instaladosPorEspacio.set(fila.espacioId, conjunto);
    }
  }

  const faltantes: unknown[][] = [];
  for (const s of seccionesConSoftware) {
    if (s.softwareRequerido.length === 0) continue;
    for (const a of s.asignaciones) {
      for (const ae of a.espacios) {
        if (ae.espacio.tipo !== TipoEspacio.LABORATORIO) continue;
        const instalados = instaladosPorEspacio.get(ae.espacio.id) ?? new Set<string>();
        const faltan = s.softwareRequerido
          .filter(
            (f) =>
              !instalados.has(`${f.software.nombreNormalizado} ${f.software.version}`.trim()),
          )
          .map((f) => `${f.software.nombre}${f.software.version ? ` ${f.software.version}` : ''}`);
        if (faltan.length > 0) {
          faltantes.push([
            s.curso.codigo,
            s.codigoSeccion,
            s.curso.nombre,
            ae.espacio.identificador,
            ae.espacio.pabellon,
            ae.espacio.piso,
            lista(faltan),
          ]);
        }
      }
    }
  }

  escribir(
    'fallos-02-software.csv',
    ['codigoCurso', 'codigoSeccion', 'curso', 'laboratorio', 'pabellon', 'piso', 'softwareFaltante'],
    faltantes,
  );

  // ── fallos-03 · Bloques con capacidad insuficiente ──────────────────────────
  const capacidadInsuficiente = asignaciones
    .filter((a) => a.estado === EstadoAsignacion.VIGENTE && a.espacios.length > 0)
    .map((a) => {
      const capacidad = a.espacios.reduce(
        (suma, e) => suma + Math.max(0, e.espacio.aforoNominal - (e.espacio.pcsMalogradas ?? 0)),
        0,
      );
      const alumnos = a.seccion._count?.matriculas ?? 0;
      return { a, capacidad, alumnos };
    })
    .filter(({ capacidad, alumnos }) => capacidad < alumnos);

  escribir(
    'fallos-03-capacidad.csv',
    ['codigoCurso', 'codigoSeccion', 'curso', 'aulas', 'capacidadReal', 'alumnosMatriculados', 'faltan'],
    capacidadInsuficiente.map(({ a, capacidad, alumnos }) => [
      a.seccion.curso.codigo,
      a.seccion.codigoSeccion,
      a.seccion.curso.nombre,
      lista(a.espacios.map((e) => e.espacio.identificador)),
      capacidad,
      alumnos,
      alumnos - capacidad,
    ]),
  );

  // ── fallos-04 · Auditoría del motor ────────────────────────────────────────
  const auditoria = await prisma.registroAuditoria.findMany({
    orderBy: { fechaHora: 'desc' },
    take: 5000,
  });

  escribir(
    'fallos-04-auditoria.csv',
    ['fechaHora', 'tipoEvento', 'detalle', 'asignacionId', 'alertaId'],
    auditoria.map((r) => [
      r.fechaHora.toISOString(),
      r.tipoEvento,
      r.detalle,
      r.asignacionId,
      r.alertaId,
    ]),
  );

  console.log('');
  console.log('✅ Exportación completada.');
  console.log('   Los archivos 02 a 05 se pueden volver a subir en «Carga de datos».');
  console.log('   Los archivos 06 y fallos-* son de diagnóstico: no se suben.');
}

exportar()
  .catch((e: unknown) => {
    console.error('❌ Error al exportar:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
