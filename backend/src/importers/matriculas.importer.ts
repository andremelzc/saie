import { PrismaClient, RolCuenta } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { generarClaveInicial } from '../lib/claves';
import { CredencialInicialDTO } from './docentes.importer';
import { periodoSchema } from '../lib/periodo';
import type { ProgresoImportacion } from '../types/importacion';

export const MatriculaSchema = z.object({
  codigoAlumno: z.string().min(1, 'El código del alumno es requerido'),
  nombre: z.string().min(1, 'El nombre del alumno es requerido'),
  correo: z.string().email('Correo electrónico inválido'),
  movilidadReducida: z.boolean().default(false),
  codigoCurso: z.string().min(1, 'El código del curso es requerido'),
  codigoSeccion: z.string().min(1, 'El código de la sección es requerido'),
  periodo: periodoSchema,
  crearCuentaAcceso: z.boolean().default(true),
});

export type MatriculaInput = z.infer<typeof MatriculaSchema>;

export interface ResultadoImportacionMatriculas {
  alumnosProcesados: number;
  cuentasCreadas: number;
  matriculasProcesadas: number;
  /** Issue 1.17 (R35): matrículas que ya no figuran en el archivo de su sección (retiros). */
  matriculasRetiradas: number;
  errores: string[];
  clavesIniciales?: CredencialInicialDTO[];
}

export async function importarMatriculas(
  datos: unknown[],
  prisma: PrismaClient,
  onProgreso?: ProgresoImportacion,
): Promise<ResultadoImportacionMatriculas> {
  let alumnosProcesados = 0;
  let cuentasCreadas = 0;
  let matriculasProcesadas = 0;
  // Issue 1.17: alumnos que el archivo indica para cada sección, para retirar a los demás.
  const enArchivo = new Map<string, Set<string>>();
  const errores: string[] = [];
  const clavesIniciales: CredencialInicialDTO[] = [];

  for (let i = 0; i < datos.length; i++) {
    onProgreso?.(i, datos.length);
    const validacion = MatriculaSchema.safeParse(datos[i]);

    if (!validacion.success) {
      errores.push(`Fila ${i + 1}: ${validacion.error.issues.map((e) => e.message).join(', ')}`);
      continue;
    }

    const {
      codigoAlumno,
      nombre,
      correo,
      movilidadReducida,
      codigoCurso,
      codigoSeccion,
      periodo,
      crearCuentaAcceso,
    } = validacion.data;

    try {
      // 1. Crear o actualizar cuenta si aplica (Issue 1.7)
      let cuentaId: string | undefined = undefined;

      if (crearCuentaAcceso) {
        const usuarioLogin = codigoAlumno;
        const cuentaExistente = prisma.cuenta.findUnique
          ? await prisma.cuenta.findUnique({ where: { usuarioLogin } })
          : null;

        if (!cuentaExistente) {
          const claveInicial = generarClaveInicial();
          const claveInicialHash = await bcrypt.hash(claveInicial, 10);

          let cuenta;
          if (prisma.cuenta.create) {
            cuenta = await prisma.cuenta.create({
              data: {
                rol: RolCuenta.ALUMNO,
                usuarioLogin,
                claveHash: claveInicialHash,
                debeCambiarClave: true,
              },
            });
          } else {
            cuenta = await prisma.cuenta.upsert({
              where: { usuarioLogin },
              update: {},
              create: {
                rol: RolCuenta.ALUMNO,
                usuarioLogin,
                claveHash: claveInicialHash,
                debeCambiarClave: true,
              },
            });
          }
          cuentaId = cuenta.id;
          cuentasCreadas++;
          clavesIniciales.push({
            codigo: codigoAlumno,
            nombre,
            correo,
            rol: RolCuenta.ALUMNO,
            claveInicial,
          });
        } else {
          cuentaId = cuentaExistente.id;
        }
      }

      // 2. Crear o actualizar Alumno
      const alumno = await prisma.alumno.upsert({
        where: { codigo: codigoAlumno },
        update: {
          nombre,
          correo,
          ...(cuentaId ? { cuentaId } : {}),
        },
        create: {
          codigo: codigoAlumno,
          nombre,
          correo,
          ...(cuentaId ? { cuentaId } : {}),
        },
        include: { fichaMedica: { select: { condicionAccesible: true } } },
      });
      alumnosProcesados++;

      // Issue 3.59 (riesgo R11 de la auditoría): la importación nunca borra la movilidad reducida
      // que el alumno declaró en su ficha. La matrícula la lleva si lo indica el CSV o la ficha.
      const movilidadFinal = movilidadReducida || alumno.fichaMedica?.condicionAccesible === true;

      // 3. Buscar Sección
      const curso = await prisma.curso.findUnique({
        where: { codigo: codigoCurso },
      });

      if (!curso) {
        errores.push(`Fila ${i + 1}: No existe el curso ${codigoCurso}`);
        continue;
      }

      const seccion = await prisma.seccion.findUnique({
        where: {
          cursoId_codigoSeccion_periodo: {
            cursoId: curso.id,
            codigoSeccion,
            periodo,
          },
        },
      });

      if (!seccion) {
        errores.push(
          `Fila ${i + 1}: No existe la sección ${codigoSeccion} para el curso ${codigoCurso} en ${periodo}`,
        );
        continue;
      }

      // 4. Inserción o actualización idempotente de Matrícula (Issue 1.5)
      await prisma.matricula.upsert({
        where: {
          alumnoId_seccionId: {
            alumnoId: alumno.id,
            seccionId: seccion.id,
          },
        },
        update: { movilidadReducida: movilidadFinal },
        create: {
          alumnoId: alumno.id,
          seccionId: seccion.id,
          movilidadReducida: movilidadFinal,
        },
      });
      matriculasProcesadas++;
      const alumnosDeSeccion = enArchivo.get(seccion.id) ?? new Set<string>();
      alumnosDeSeccion.add(alumno.id);
      enArchivo.set(seccion.id, alumnosDeSeccion);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`Fila ${i + 1} (${codigoAlumno} en ${codigoCurso}-${codigoSeccion}): ${msg}`);
    }
  }

  // Issue 1.17: las matrículas de cada sección del archivo quedan exactamente como el archivo. Las
  // secciones que no aparecen no se tocan (se puede cargar por partes). Si alguna fila falló no se
  // retira a nadie: el archivo no se pudo leer completo.
  let matriculasRetiradas = 0;
  if (errores.length === 0) {
    for (const [seccionId, alumnoIds] of enArchivo) {
      const { count } = await prisma.matricula.deleteMany({
        where: { seccionId, alumnoId: { notIn: [...alumnoIds] } },
      });
      matriculasRetiradas += count;
    }
  }
  onProgreso?.(datos.length, datos.length);

  return {
    alumnosProcesados,
    cuentasCreadas,
    matriculasProcesadas,
    matriculasRetiradas,
    errores,
    clavesIniciales,
  };
}
