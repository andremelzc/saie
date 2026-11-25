import { ComparacionVersion, PrismaClient, TipoEspacio } from '@prisma/client';
import { z } from 'zod';
import { parsearNombreVersion } from '../lib/software';
import { resolverSoftwarePorNombre } from '../services/software.service';
import { periodoSchema } from '../lib/periodo';

/** Una hora como `08:00`: un nombre de curso no lleva horarios. */
const HORA = /\b\d{1,2}:\d{2}\b/;
/** Un código de curso (letras y dígitos juntos, como `202SW0303`). */
const CODIGO_CURSO = /\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6,}\b/g;

export const MENSAJE_NOMBRE_CURSO_MEZCLADO =
  'El nombre del curso trae datos de otro curso (horas, otro código o «--»): revisa que no se hayan pegado dos cursos';

/**
 * Issue 1.20 (riesgo R47): al extraer el horario de un PDF se pegaron dos cursos en uno y el
 * nombre de `202SW0302` arrastraba créditos, horarios y el código de `202SW0303`. Un nombre con
 * horas, con el separador `--` o con el código de otro curso se rechaza.
 */
export function nombreCursoMezclado(nombre: string, codigoCurso: string): boolean {
  if (HORA.test(nombre) || nombre.includes('--')) return true;
  return (nombre.toUpperCase().match(CODIGO_CURSO) ?? []).some(
    (codigo) => codigo !== codigoCurso.toUpperCase(),
  );
}

export const CursoSeccionSchema = z
  .object({
    codigoCurso: z.string().min(1, 'El código del curso es requerido'),
    nombreCurso: z.string().min(1, 'El nombre del curso es requerido'),
    codigoSeccion: z.string().min(1, 'El código de la sección es requerido'),
    periodo: periodoSchema,
    tipoEspacioRequerido: z.enum([TipoEspacio.AULA_TEORICA, TipoEspacio.LABORATORIO]),
    /** Nombres con versión opcional (`"Python 3.12"`): se resuelven contra el catálogo. */
    stackSoftwareRequerido: z.array(z.string()).optional().default([]),
  })
  .superRefine((fila, ctx) => {
    if (nombreCursoMezclado(fila.nombreCurso, fila.codigoCurso)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nombreCurso'],
        message: MENSAJE_NOMBRE_CURSO_MEZCLADO,
      });
    }
  });

export type CursoSeccionInput = z.infer<typeof CursoSeccionSchema>;

export interface ResultadoImportacionCursos {
  cursosProcesados: number;
  seccionesProcesadas: number;
  errores: string[];
}

interface RequerimientoResuelto {
  softwareId: string;
  comparacionVersion: ComparacionVersion;
}

/**
 * Issue 4.28: convierte los nombres de software de una fila en requerimientos del catálogo.
 * Un nombre desconocido es un error de fila (`SOFTWARE_NO_REGISTRADO`): nunca se guarda como
 * texto libre. Se conserva el comportamiento anterior con `EXACTA` cuando el texto declara
 * versión y `CUALQUIERA` cuando solo indica el nombre.
 */
async function resolverRequerimientos(
  textos: string[],
  prisma: Pick<PrismaClient, 'software'>,
): Promise<{ requerimientos: RequerimientoResuelto[]; noRegistrados: string[] }> {
  const requerimientos: RequerimientoResuelto[] = [];
  const noRegistrados: string[] = [];
  const vistos = new Set<string>();

  for (const texto of textos) {
    const parseado = parsearNombreVersion(texto);
    const software = await resolverSoftwarePorNombre(texto, undefined, prisma);

    if (!software) {
      noRegistrados.push(texto);
      continue;
    }
    if (vistos.has(software.id)) continue;
    vistos.add(software.id);
    requerimientos.push({
      softwareId: software.id,
      comparacionVersion:
        parseado.version === '' ? ComparacionVersion.CUALQUIERA : ComparacionVersion.EXACTA,
    });
  }

  return { requerimientos, noRegistrados };
}

export async function importarCursosYSecciones(
  datos: unknown[],
  prisma: PrismaClient,
): Promise<ResultadoImportacionCursos> {
  let cursosProcesados = 0;
  let seccionesProcesadas = 0;
  const errores: string[] = [];

  for (let i = 0; i < datos.length; i++) {
    const validacion = CursoSeccionSchema.safeParse(datos[i]);

    if (!validacion.success) {
      errores.push(`Fila ${i + 1}: ${validacion.error.issues.map((e) => e.message).join(', ')}`);
      continue;
    }

    const {
      codigoCurso,
      nombreCurso,
      codigoSeccion,
      periodo,
      tipoEspacioRequerido,
      stackSoftwareRequerido,
    } = validacion.data;

    const textosSoftware =
      tipoEspacioRequerido === TipoEspacio.LABORATORIO ? stackSoftwareRequerido : [];
    const { requerimientos, noRegistrados } = await resolverRequerimientos(textosSoftware, prisma);

    if (noRegistrados.length > 0) {
      errores.push(
        `Fila ${i + 1} (${codigoCurso}-${codigoSeccion}): SOFTWARE_NO_REGISTRADO ${noRegistrados.join(', ')}`,
      );
      continue;
    }

    try {
      // 1. Inserción o actualización idempotente de Curso
      const curso = await prisma.curso.upsert({
        where: { codigo: codigoCurso },
        update: { nombre: nombreCurso },
        create: { codigo: codigoCurso, nombre: nombreCurso },
      });
      cursosProcesados++;

      const relaciones = requerimientos.map((r) => ({
        softwareId: r.softwareId,
        comparacionVersion: r.comparacionVersion,
      }));

      // 2. Inserción o actualización idempotente de Sección, reemplazando sus requerimientos
      await prisma.seccion.upsert({
        where: {
          cursoId_codigoSeccion_periodo: {
            cursoId: curso.id,
            codigoSeccion,
            periodo,
          },
        },
        update: {
          tipoEspacioRequerido,
          softwareRequerido: {
            deleteMany: {},
            create: relaciones,
          },
        },
        create: {
          cursoId: curso.id,
          codigoSeccion,
          periodo,
          tipoEspacioRequerido,
          softwareRequerido: { create: relaciones },
        },
      });
      seccionesProcesadas++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`Fila ${i + 1} (${codigoCurso}-${codigoSeccion}): ${msg}`);
    }
  }

  return { cursosProcesados, seccionesProcesadas, errores };
}
