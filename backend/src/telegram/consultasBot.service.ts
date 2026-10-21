import { DiaSemana, PrismaClient } from '@prisma/client';
import {
  agruparPorDia,
  construirSesiones,
  diaYMinutosEnLima,
  INCLUIR_SECCION_CON_ASIGNACION,
  minutosDesdeHora,
  ORDEN_DIAS,
} from '../lib/horario';
import { obtenerPeriodoVigente } from '../services/periodo.service';

export const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

/**
 * Obtiene las sesiones del periodo vigente para el alumno vinculado a este chat.
 */
async function obtenerSesionesAlumno(chatId: string, prisma: PrismaClient) {
  const vinculacion = await prisma.vinculacionTelegram.findUnique({
    where: { chatId },
    include: { alumno: true },
  });

  if (!vinculacion || !vinculacion.activo) {
    return { alumno: null, sesiones: [], periodo: null };
  }

  const periodo = await obtenerPeriodoVigente(prisma);
  if (!periodo) {
    return { alumno: vinculacion.alumno, sesiones: [], periodo: null };
  }

  const matriculas = await prisma.matricula.findMany({
    where: { alumnoId: vinculacion.alumnoId, seccion: { periodo } },
    include: { seccion: { include: INCLUIR_SECCION_CON_ASIGNACION } },
  });

  const secciones = matriculas.map((m) => m.seccion);
  const sesiones = construirSesiones(secciones);
  return { alumno: vinculacion.alumno, sesiones, periodo };
}

/**
 * Responde a /hoy con las clases programadas para el día de hoy (hora de Lima).
 */
export async function consultarClasesHoy(
  chatId: string,
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<string> {
  const { alumno, sesiones } = await obtenerSesionesAlumno(chatId, prisma);
  if (!alumno) {
    return 'No tienes una cuenta vinculada. Envía tu código y tu clave separados por un espacio (ej: 23200107 miClave).';
  }

  const { dia } = diaYMinutosEnLima(ahora);
  const clasesHoy = sesiones
    .filter((s) => s.diaSemana === dia)
    .sort((a, b) => minutosDesdeHora(a.horaInicio) - minutosDesdeHora(b.horaInicio));

  if (clasesHoy.length === 0) {
    return `Hoy ${NOMBRE_DIA[dia]} no tienes clases programadas. ¡Que tengas un buen día!`;
  }

  const lineas = clasesHoy.map((c) => {
    const espacios =
      c.espacios.length > 0
        ? c.espacios.map((e) => e.identificador).join(', ')
        : 'Aula por confirmar';
    return `• ${c.horaInicio} - ${c.horaFin} | ${c.codigoCurso} - ${c.nombreCurso} (Sec. ${c.codigoSeccion})\n  📍 ${espacios}`;
  });

  return [`📚 Tus clases de hoy (${NOMBRE_DIA[dia]}):`, '', ...lineas].join('\n');
}

/**
 * Responde a /ahora indicando la clase en curso o la próxima clase de hoy.
 */
export async function consultarClaseActual(
  chatId: string,
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<string> {
  const { alumno, sesiones } = await obtenerSesionesAlumno(chatId, prisma);
  if (!alumno) {
    return 'No tienes una cuenta vinculada. Envía tu código y tu clave separados por un espacio (ej: 23200107 miClave).';
  }

  const { dia, minutos } = diaYMinutosEnLima(ahora);
  const clasesHoy = sesiones
    .filter((s) => s.diaSemana === dia)
    .sort((a, b) => minutosDesdeHora(a.horaInicio) - minutosDesdeHora(b.horaInicio));

  // 1. ¿Está en clase en este momento?
  const enCurso = clasesHoy.find((c) => {
    const ini = minutosDesdeHora(c.horaInicio);
    const fin = minutosDesdeHora(c.horaFin);
    return minutos >= ini && minutos < fin;
  });

  if (enCurso) {
    const espacios =
      enCurso.espacios.length > 0
        ? enCurso.espacios
            .map((e) => `${e.identificador} (Pabellón ${e.pabellon}, Piso ${e.piso})`)
            .join(', ')
        : 'Aula por confirmar';
    const minutosRestantes = minutosDesdeHora(enCurso.horaFin) - minutos;
    return [
      '🔔 En este momento estás en horario de clase:',
      '',
      `📖 Curso: ${enCurso.codigoCurso} - ${enCurso.nombreCurso} (Sec. ${enCurso.codigoSeccion})`,
      `📍 Espacio: ${espacios}`,
      `⏰ Horario: ${enCurso.horaInicio} - ${enCurso.horaFin} (termina en ${minutosRestantes} min)`,
      enCurso.docenteNombre ? `👨‍🏫 Docente: ${enCurso.docenteNombre}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // 2. Si no está en clase, ¿cuál es la próxima clase de hoy?
  const proxima = clasesHoy.find((c) => minutosDesdeHora(c.horaInicio) > minutos);
  if (proxima) {
    const espacios =
      proxima.espacios.length > 0
        ? proxima.espacios
            .map((e) => `${e.identificador} (Pabellón ${e.pabellon}, Piso ${e.piso})`)
            .join(', ')
        : 'Aula por confirmar';
    const minutosParaEmpezar = minutosDesdeHora(proxima.horaInicio) - minutos;
    return [
      '☕ No tienes clase en este momento.',
      '',
      'Tu próxima clase de hoy es:',
      `📖 Curso: ${proxima.codigoCurso} - ${proxima.nombreCurso} (Sec. ${proxima.codigoSeccion})`,
      `📍 Espacio: ${espacios}`,
      `⏰ Horario: ${proxima.horaInicio} - ${proxima.horaFin} (comienza en ${minutosParaEmpezar} min)`,
      proxima.docenteNombre ? `👨‍🏫 Docente: ${proxima.docenteNombre}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // 3. Ya no tiene más clases hoy
  if (clasesHoy.length > 0) {
    return '✅ Ya no tienes más clases programadas por el resto del día de hoy.';
  }

  return `Hoy ${NOMBRE_DIA[dia]} no tienes clases programadas.`;
}

/**
 * Responde a /horario con la grilla de la semana completa agrupada por día.
 */
export async function consultarHorarioSemanal(
  chatId: string,
  prisma: PrismaClient,
): Promise<string> {
  const { alumno, sesiones, periodo } = await obtenerSesionesAlumno(chatId, prisma);
  if (!alumno) {
    return 'No tienes una cuenta vinculada. Envía tu código y tu clave separados por un espacio (ej: 23200107 miClave).';
  }

  if (sesiones.length === 0) {
    return 'No tienes cursos matriculados con horario en el periodo vigente.';
  }

  const agrupado = agruparPorDia(sesiones);
  const bloques: string[] = [`📅 Tu horario semanal (Periodo ${periodo ?? ''}):`];

  for (const d of ORDEN_DIAS) {
    const clasesDia = agrupado[d];
    if (!clasesDia || clasesDia.length === 0) continue;

    bloques.push('');
    bloques.push(`🗓 ${NOMBRE_DIA[d].toUpperCase()}`);
    for (const c of clasesDia) {
      const espacios =
        c.espacios.length > 0
          ? c.espacios.map((e) => e.identificador).join(', ')
          : 'Aula por confirmar';
      bloques.push(`  • ${c.horaInicio} - ${c.horaFin} | ${c.codigoCurso} - ${c.nombreCurso}`);
      bloques.push(`    📍 ${espacios}`);
    }
  }

  return bloques.join('\n');
}
