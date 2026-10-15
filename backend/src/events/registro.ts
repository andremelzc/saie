import { prisma } from '../lib/prisma';
import { crearClienteTelegram } from '../telegram/cliente';
import { avisarCambioDeAsignacion } from '../telegram/notificador';
import { bus } from './bus';

let registrado = false;

/**
 * Conecta los manejadores con el bus de eventos. Se llama una vez al arrancar el servidor
 * (`index.ts`); `createApp` no la llama, así las pruebas de las rutas no disparan manejadores.
 *
 * Los avisos por Telegram solo se activan si hay token configurado: sin él, el sistema funciona
 * igual y simplemente no avisa.
 */
export function registrarManejadores(): void {
  if (registrado) return;
  registrado = true;

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[eventos] TELEGRAM_BOT_TOKEN no está configurado: no se enviarán avisos');
    return;
  }

  const cliente = crearClienteTelegram();
  bus.suscribir('asignacion.cambiada', async (evento) => {
    await avisarCambioDeAsignacion(evento, { prisma, cliente });
  });
}
