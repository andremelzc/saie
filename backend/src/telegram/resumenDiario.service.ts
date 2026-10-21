import { DiaSemana, EstadoAsignacion, PrismaClient } from '@prisma/client';
import { diaYMinutosEnLima } from '../lib/horario';
import { obtenerPeriodoVigente } from '../services/periodo.service';
import { ClienteTelegram } from './cliente';
import { ColaEnvios, colaEnvios } from './cola';
import { enviarConReintentos } from './notificador';

const ZONA_HORARIA = 'America/Lima';

const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

export interface ClaseDelDia {
  horaInicio: string;
  horaFin: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  /** Vacío si la sección todavía no tiene un aula vigente. */
  espacios: string[];
}

export interface ResumenDiario {
  destinatarios: number;
  enviados: number;
  /** Vinculados que no tienen clases ese día: no reciben nada. */
  sinClases: number;
  desactivados: number;
  fallidos: number;
}

export interface DependenciasResumen {
  prisma: PrismaClient;
  cliente: ClienteTelegram;
  cola?: ColaEnvios;
  esperar?: (ms: number) => Promise<void>;
}

/** Fecha de calendario en Lima como `AAAA-MM-DD`. */
export function fechaEnLima(instante: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** Texto del resumen. Solo clases, aulas y horarios: nunca datos de salud ni movilidad (RNF-11). */
export function formatearResumenDiario(
  dia: DiaSemana,
  fecha: string,
  clases: ClaseDelDia[],
): string {
  const [, mes, diaDelMes] = fecha.split('-');
  const lineas = [...clases]
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    .map(
      (c) =>
        `${c.horaInicio}-${c.horaFin}  ${c.codigoCurso} - ${c.nombreCurso} (sec. ${c.codigoSeccion})\n` +
        `   ${c.espacios.length > 0 ? c.espacios.join(', ') : 'aula por confirmar'}`,
    );
  return [`Tus clases de hoy, ${NOMBRE_DIA[dia]} ${diaDelMes}/${mes}`, '', ...lineas].join('\n');
}

/**
 * Issue 3.27: envía a cada alumno con Telegram vinculado y con clases hoy (hora de Lima) un
 * resumen de sus clases, aulas y horarios. Quien no tiene clases no recibe nada.
 *
 * Idempotente: antes de enviar se "reclama" el día en `fecha_ultimo_resumen` con una
 * actualización condicional; si otra ejecución ya lo reclamó, esta lo omite. Si el envío
 * falla se restaura el valor anterior, para que una nueva ejecución pueda reintentarlo.
 */
export async function enviarResumenesDiarios(
  { prisma, cliente, cola = colaEnvios, esperar }: DependenciasResumen,
  ahora: Date = new Date(),
): Promise<ResumenDiario> {
  const resumen: ResumenDiario = {
    destinatarios: 0,
    enviados: 0,
    sinClases: 0,
    desactivados: 0,
    fallidos: 0,
  };

  const periodo = await obtenerPeriodoVigente(prisma);
  if (!periodo) return resumen;

  const { dia } = diaYMinutosEnLima(ahora);
  const fecha = fechaEnLima(ahora);
  const hoy = new Date(`${fecha}T00:00:00.000Z`);
  const conClasesHoy = { periodo, horarios: { some: { diaSemana: dia } } };

  const vinculaciones = await prisma.vinculacionTelegram.findMany({
    where: {
      activo: true,
      OR: [{ fechaUltimoResumen: null }, { fechaUltimoResumen: { lt: hoy } }],
      alumno: { matriculas: { some: { seccion: conClasesHoy } } },
    },
    select: {
      id: true,
      chatId: true,
      fechaUltimoResumen: true,
      alumno: {
        select: {
          matriculas: {
            where: { seccion: conClasesHoy },
            select: {
              seccion: {
                select: {
                  codigoSeccion: true,
                  curso: { select: { codigo: true, nombre: true } },
                  horarios: {
                    where: { diaSemana: dia },
                    select: { horaInicio: true, horaFin: true },
                  },
                  asignaciones: {
                    where: { estado: EstadoAsignacion.VIGENTE },
                    orderBy: { fechaAsignacion: 'desc' },
                    take: 1,
                    select: {
                      espacios: { select: { espacio: { select: { identificador: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  resumen.destinatarios = vinculaciones.length;

  for (const vinculacion of vinculaciones) {
    const clases: ClaseDelDia[] = vinculacion.alumno.matriculas.flatMap(({ seccion }) =>
      seccion.horarios.map((h) => ({
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
        codigoCurso: seccion.curso.codigo,
        nombreCurso: seccion.curso.nombre,
        codigoSeccion: seccion.codigoSeccion,
        espacios: (seccion.asignaciones[0]?.espacios ?? []).map((e) => e.espacio.identificador),
      })),
    );

    if (clases.length === 0) {
      resumen.sinClases++;
      continue;
    }

    // Reclamar el día: solo una ejecución puede enviar el resumen de hoy a esta vinculación.
    const { count } = await prisma.vinculacionTelegram.updateMany({
      where: {
        id: vinculacion.id,
        OR: [{ fechaUltimoResumen: null }, { fechaUltimoResumen: { lt: hoy } }],
      },
      data: { fechaUltimoResumen: hoy },
    });
    if (count === 0) continue;

    const resultado = await enviarConReintentos(
      cliente,
      vinculacion.chatId,
      formatearResumenDiario(dia, fecha, clases),
      cola,
      esperar,
    );

    if (resultado === 'ENVIADO') {
      resumen.enviados++;
      continue;
    }

    if (resultado === 'BLOQUEADO') {
      await prisma.vinculacionTelegram.updateMany({
        where: { id: vinculacion.id },
        data: { activo: false, fechaBaja: new Date() },
      });
      resumen.desactivados++;
      console.warn(
        `[telegram] Vinculación ${vinculacion.id} desactivada: el alumno bloqueó el bot`,
      );
    } else {
      // No se pudo enviar: se libera el día para que otra ejecución lo reintente.
      await prisma.vinculacionTelegram.updateMany({
        where: { id: vinculacion.id },
        data: { fechaUltimoResumen: vinculacion.fechaUltimoResumen },
      });
      resumen.fallidos++;
      console.error(`[telegram] No se pudo enviar el resumen a la vinculación ${vinculacion.id}`);
    }
  }

  return resumen;
}
