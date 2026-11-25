import { ComparacionVersion, EstadoPeriodo, PrismaClient, TipoEspacio } from '@prisma/client';
import {
  GrupoSoftware,
  LABORATORIOS_ESPECIALIZADOS,
  PROGRAMAS_CATALOGO,
  ProgramaCatalogo,
  ReferenciaLaboratorio,
  SOFTWARE_POR_CURSO,
} from '../data/catalogoSoftwareAprobado';
import { normalizarNombreSoftware } from '../lib/software';

/**
 * Carga del catálogo de software aprobado (Issue 6.14, riesgo R41).
 *
 * Planifica en memoria qué programas, instalaciones y requisitos faltan (sin tocar la base) y
 * luego los aplica de forma aditiva e idempotente: nunca borra software, instalaciones ni
 * requisitos que ya existan, y correrlo dos veces no duplica nada.
 */

/** Lo que el plan necesita de un laboratorio. */
export interface LaboratorioParaCatalogo {
  id: string;
  identificador: string;
  pabellon: string;
}

/** Lo que el plan necesita de una sección de laboratorio. */
export interface SeccionParaCatalogo {
  id: string;
  codigoSeccion: string;
  periodo: string;
  codigoCurso: string;
}

export interface CatalogoAprobado {
  programas: readonly ProgramaCatalogo[];
  especializados: Readonly<Record<string, readonly ReferenciaLaboratorio[]>>;
  softwarePorCurso: Readonly<Record<string, readonly string[]>>;
}

export const CATALOGO_APROBADO: CatalogoAprobado = {
  programas: PROGRAMAS_CATALOGO,
  especializados: LABORATORIOS_ESPECIALIZADOS,
  softwarePorCurso: SOFTWARE_POR_CURSO,
};

export interface InstalacionPlanificada {
  espacioId: string;
  laboratorio: string;
  programas: string[];
}

export interface RequisitoPlanificado {
  seccionId: string;
  seccion: string;
  programas: string[];
}

export interface PlanCargaCatalogo {
  programas: readonly ProgramaCatalogo[];
  instalaciones: InstalacionPlanificada[];
  requisitos: RequisitoPlanificado[];
  /** Laboratorios especializados del catálogo que no existen en la base. */
  laboratoriosNoEncontrados: string[];
  /** Cursos del catálogo sin secciones de laboratorio activas en periodos abiertos. */
  cursosSinSecciones: string[];
}

export interface ResultadoCargaCatalogo {
  programasNuevos: number;
  instalacionesNuevas: number;
  requisitosNuevos: number;
}

const GRUPOS_EN_TODOS: readonly GrupoSoftware[] = ['BASE', 'GENERAL'];

/** Minúsculas y sin tildes: «Nuevo Pabellón» y «nuevo pabellon» son el mismo pabellón. */
export function normalizarPabellon(pabellon: string): string {
  return pabellon.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Número del laboratorio en su identificador («Aula 207 - Laboratorio 01» → 1); `null` si no lo tiene. */
export function numeroDeLaboratorio(identificador: string): number | null {
  const m = /laboratorio\s*0*(\d+)/i.exec(identificador);
  return m ? Number(m[1]) : null;
}

const claveLaboratorio = (pabellon: string, numero: number) =>
  `${normalizarPabellon(pabellon)}#${numero}`;

const etiquetaReferencia = (r: ReferenciaLaboratorio) =>
  `${r.pabellon} · Laboratorio ${String(r.numero).padStart(2, '0')}`;

/**
 * Comprueba que el catálogo sea coherente: sin programas repetidos, cada grupo especializado con
 * laboratorios y cada programa que pide un curso presente en el catálogo. Devuelve los problemas.
 */
export function validarCatalogo(catalogo: CatalogoAprobado = CATALOGO_APROBADO): string[] {
  const problemas: string[] = [];
  const nombres = new Set<string>();
  for (const p of catalogo.programas) {
    const clave = normalizarNombreSoftware(p.nombre);
    if (nombres.has(clave))
      problemas.push(`El programa «${p.nombre}» está repetido en el catálogo.`);
    nombres.add(clave);
    if (!GRUPOS_EN_TODOS.includes(p.grupo) && !catalogo.especializados[p.grupo]?.length) {
      problemas.push(`El grupo ${p.grupo} de «${p.nombre}» no tiene laboratorios asignados.`);
    }
  }
  for (const [curso, programas] of Object.entries(catalogo.softwarePorCurso)) {
    for (const nombre of programas) {
      if (!nombres.has(normalizarNombreSoftware(nombre))) {
        problemas.push(`El curso ${curso} pide «${nombre}», que no está en el catálogo.`);
      }
    }
  }
  return problemas;
}

/**
 * Calcula qué software va en cada laboratorio y qué requisitos lleva cada sección. No toca la
 * base: sirve para revisar el resultado antes de aplicarlo.
 */
export function planificarCargaCatalogo(
  laboratorios: LaboratorioParaCatalogo[],
  secciones: SeccionParaCatalogo[],
  catalogo: CatalogoAprobado = CATALOGO_APROBADO,
): PlanCargaCatalogo {
  const problemas = validarCatalogo(catalogo);
  if (problemas.length > 0) {
    throw new Error(`El catálogo aprobado tiene errores:\n- ${problemas.join('\n- ')}`);
  }

  const enTodos = catalogo.programas
    .filter((p) => GRUPOS_EN_TODOS.includes(p.grupo))
    .map((p) => p.nombre);

  // Programas especializados de cada laboratorio, según su pabellón y número.
  const especializadosPorLab = new Map<string, string[]>();
  const laboratoriosNoEncontrados = new Set<string>();
  const existentes = new Set(
    laboratorios.flatMap((l) => {
      const n = numeroDeLaboratorio(l.identificador);
      return n === null ? [] : [claveLaboratorio(l.pabellon, n)];
    }),
  );
  for (const p of catalogo.programas) {
    for (const ref of catalogo.especializados[p.grupo] ?? []) {
      const clave = claveLaboratorio(ref.pabellon, ref.numero);
      if (!existentes.has(clave)) {
        laboratoriosNoEncontrados.add(etiquetaReferencia(ref));
        continue;
      }
      especializadosPorLab.set(clave, [...(especializadosPorLab.get(clave) ?? []), p.nombre]);
    }
  }

  const instalaciones = laboratorios.map((l) => {
    const n = numeroDeLaboratorio(l.identificador);
    const extra =
      n === null ? [] : (especializadosPorLab.get(claveLaboratorio(l.pabellon, n)) ?? []);
    return {
      espacioId: l.id,
      laboratorio: `${l.pabellon} · ${l.identificador}`,
      programas: [...enTodos, ...extra],
    };
  });

  const requisitos: RequisitoPlanificado[] = [];
  const cursosConSecciones = new Set<string>();
  for (const s of secciones) {
    const programas = catalogo.softwarePorCurso[s.codigoCurso];
    if (!programas?.length) continue;
    cursosConSecciones.add(s.codigoCurso);
    requisitos.push({
      seccionId: s.id,
      seccion: `${s.codigoCurso} ${s.codigoSeccion} (${s.periodo})`,
      programas: [...programas],
    });
  }

  const cursosSinSecciones = Object.entries(catalogo.softwarePorCurso)
    .filter(([curso, programas]) => programas.length > 0 && !cursosConSecciones.has(curso))
    .map(([curso]) => curso)
    .sort((a, b) => a.localeCompare(b));

  return {
    programas: catalogo.programas,
    instalaciones,
    requisitos,
    laboratoriosNoEncontrados: [...laboratoriosNoEncontrados].sort((a, b) => a.localeCompare(b)),
    cursosSinSecciones,
  };
}

type PrismaCatalogo = Pick<
  PrismaClient,
  | 'espacio'
  | 'seccion'
  | 'periodo'
  | 'software'
  | 'espacioSoftware'
  | 'seccionSoftware'
  | '$transaction'
>;

/**
 * Lee de la base los laboratorios y las secciones de laboratorio activas de los periodos que no
 * están cerrados (un periodo cerrado solo admite consulta).
 */
export async function leerDatosParaCatalogo(prisma: PrismaCatalogo): Promise<{
  laboratorios: LaboratorioParaCatalogo[];
  secciones: SeccionParaCatalogo[];
}> {
  const periodosAbiertos = await prisma.periodo.findMany({
    where: { estado: { not: EstadoPeriodo.CERRADO } },
    select: { codigo: true },
  });
  const laboratorios = await prisma.espacio.findMany({
    where: { tipo: TipoEspacio.LABORATORIO },
    select: { id: true, identificador: true, pabellon: true },
    orderBy: [{ pabellon: 'asc' }, { identificador: 'asc' }],
  });
  const secciones = await prisma.seccion.findMany({
    where: {
      tipoEspacioRequerido: TipoEspacio.LABORATORIO,
      activa: true,
      periodo: { in: periodosAbiertos.map((p) => p.codigo) },
    },
    select: { id: true, codigoSeccion: true, periodo: true, curso: { select: { codigo: true } } },
  });
  return {
    laboratorios,
    secciones: secciones.map((s) => ({
      id: s.id,
      codigoSeccion: s.codigoSeccion,
      periodo: s.periodo,
      codigoCurso: s.curso.codigo,
    })),
  };
}

/**
 * Aplica el plan en una sola transacción: crea los programas que faltan (sin versión) y añade
 * las instalaciones y los requisitos que faltan. No modifica ni borra lo que ya existe.
 */
export async function aplicarCargaCatalogo(
  prisma: PrismaCatalogo,
  plan: PlanCargaCatalogo,
): Promise<ResultadoCargaCatalogo> {
  return prisma.$transaction(
    async (tx) => {
      const normalizados = plan.programas.map((p) => normalizarNombreSoftware(p.nombre));
      const previos = await tx.software.findMany({
        where: { nombreNormalizado: { in: normalizados }, version: '' },
        select: { id: true, nombreNormalizado: true },
      });
      const idPorNombre = new Map(previos.map((s) => [s.nombreNormalizado, s.id]));

      let programasNuevos = 0;
      for (const p of plan.programas) {
        const nombreNormalizado = normalizarNombreSoftware(p.nombre);
        if (idPorNombre.has(nombreNormalizado)) continue;
        const creado = await tx.software.create({
          data: {
            nombre: p.nombre,
            nombreNormalizado,
            version: '',
            categoria: p.categoria,
            tipoLicencia: p.tipoLicencia,
            descripcion: p.descripcion ?? null,
          },
          select: { id: true },
        });
        idPorNombre.set(nombreNormalizado, creado.id);
        programasNuevos++;
      }

      const id = (nombre: string) => idPorNombre.get(normalizarNombreSoftware(nombre)) as string;

      const instalaciones = await tx.espacioSoftware.createMany({
        data: plan.instalaciones.flatMap((i) =>
          i.programas.map((nombre) => ({ espacioId: i.espacioId, softwareId: id(nombre) })),
        ),
        skipDuplicates: true,
      });
      const requisitos = await tx.seccionSoftware.createMany({
        data: plan.requisitos.flatMap((r) =>
          r.programas.map((nombre) => ({
            seccionId: r.seccionId,
            softwareId: id(nombre),
            comparacionVersion: ComparacionVersion.CUALQUIERA,
          })),
        ),
        skipDuplicates: true,
      });

      return {
        programasNuevos,
        instalacionesNuevas: instalaciones.count,
        requisitosNuevos: requisitos.count,
      };
    },
    { timeout: 60_000 },
  );
}

/** Líneas legibles del plan, para revisarlo antes de aplicarlo. */
export function resumirPlan(plan: PlanCargaCatalogo): string[] {
  const lineas = [
    `Catálogo: ${plan.programas.length} programas.`,
    `Laboratorios: ${plan.instalaciones.length}.`,
    ...plan.instalaciones.map((i) => `  - ${i.laboratorio}: ${i.programas.length} programas`),
    `Secciones de laboratorio con requisitos: ${plan.requisitos.length}.`,
  ];
  if (plan.laboratoriosNoEncontrados.length > 0) {
    lineas.push(
      `⚠️ Laboratorios especializados que no están en la base: ${plan.laboratoriosNoEncontrados.join(', ')}.`,
    );
  }
  if (plan.cursosSinSecciones.length > 0) {
    lineas.push(
      `ℹ️ Cursos del catálogo sin secciones de laboratorio activas: ${plan.cursosSinSecciones.join(', ')}.`,
    );
  }
  return lineas;
}
