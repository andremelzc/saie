import { PrismaClient, RolCuenta } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';

export const MatriculaSchema = z.object({
  codigoAlumno: z.string().min(1, 'El código del alumno es requerido'),
  nombre: z.string().min(1, 'El nombre del alumno es requerido'),
  correo: z.string().email('Correo electrónico inválido'),
  movilidadReducida: z.boolean().default(false),
  codigoCurso: z.string().min(1, 'El código del curso es requerido'),
  codigoSeccion: z.string().min(1, 'El código de la sección es requerido'),
  periodo: z.string().min(1, 'El periodo es requerido'),
  crearCuentaAcceso: z.boolean().default(true),
});

export type MatriculaInput = z.infer<typeof MatriculaSchema>;

export interface ResultadoImportacionMatriculas {
  alumnosProcesados: number;
  cuentasCreadas: number;
  matriculasProcesadas: number;
  errores: string[];
}

export async function importarMatriculas(
  datos: unknown[],
  prisma: PrismaClient,
): Promise<ResultadoImportacionMatriculas> {
  let alumnosProcesados = 0;
  let cuentasCreadas = 0;
  let matriculasProcesadas = 0;
  const errores: string[] = [];

  for (let i = 0; i < datos.length; i++) {
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
        const claveInicialHash = await bcrypt.hash(codigoAlumno, 10);

        const cuenta = await prisma.cuenta.upsert({
          where: { usuarioLogin },
          update: {},
          create: {
            rol: RolCuenta.ALUMNO,
            usuarioLogin,
            claveHash: claveInicialHash,
            debeCambiarClave: true,
          },
        });
        cuentaId = cuenta.id;
        cuentasCreadas++;
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
      });
      alumnosProcesados++;

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
        update: { movilidadReducida },
        create: {
          alumnoId: alumno.id,
          seccionId: seccion.id,
          movilidadReducida,
        },
      });
      matriculasProcesadas++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`Fila ${i + 1} (${codigoAlumno} en ${codigoCurso}-${codigoSeccion}): ${msg}`);
    }
  }

  return { alumnosProcesados, cuentasCreadas, matriculasProcesadas, errores };
}
