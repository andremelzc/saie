import { PrismaClient, RolCuenta } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';

export const DocenteSchema = z.object({
  codigoDocente: z.string().min(1, 'El código del docente es requerido'),
  nombre: z.string().min(1, 'El nombre del docente es requerido'),
  correoInstitucional: z.string().email('Correo institucional inválido'),
  departamento: z.string().min(1, 'El departamento académico es requerido'),
});

export type DocenteInput = z.infer<typeof DocenteSchema>;

export interface ResultadoImportacionDocentes {
  docentesProcesados: number;
  cuentasCreadas: number;
  errores: string[];
}

export async function importarDocentes(
  datos: unknown[],
  prisma: PrismaClient
): Promise<ResultadoImportacionDocentes> {
  let docentesProcesados = 0;
  let cuentasCreadas = 0;
  const errores: string[] = [];

  for (let i = 0; i < datos.length; i++) {
    const validacion = DocenteSchema.safeParse(datos[i]);

    if (!validacion.success) {
      errores.push(`Fila ${i + 1}: ${validacion.error.issues.map((e) => e.message).join(', ')}`);
      continue;
    }

    const { codigoDocente, nombre, correoInstitucional, departamento } = validacion.data;

    try {
      // 1. Crear o actualizar cuenta de acceso (Rol DOCENTE)
      const usuarioLogin = codigoDocente;
      const claveInicialHash = await bcrypt.hash(codigoDocente, 10);

      const cuenta = await prisma.cuenta.upsert({
        where: { usuarioLogin },
        update: {},
        create: {
          rol: RolCuenta.DOCENTE,
          usuarioLogin,
          claveHash: claveInicialHash,
          debeCambiarClave: true,
        },
      });
      cuentasCreadas++;

      // 2. Crear o actualizar Docente vinculado a la cuenta
      await prisma.docente.upsert({
        where: { codigoDocente },
        update: {
          nombre,
          correoInstitucional,
          departamento,
          cuentaId: cuenta.id,
        },
        create: {
          codigoDocente,
          nombre,
          correoInstitucional,
          departamento,
          cuentaId: cuenta.id,
        },
      });
      docentesProcesados++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`Fila ${i + 1} (${codigoDocente}): ${msg}`);
    }
  }

  return { docentesProcesados, cuentasCreadas, errores };
}
