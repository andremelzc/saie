import React, { useState } from 'react';
import CabeceraPantalla from '../components/estudiante/CabeceraPantalla';
import { EstadoError } from '../components/ui/EstadoError';
import { ID_CONTENIDO } from '../components/ui/EnlaceSaltar';
import { EsqueletoCarga, Icono } from '../components/estudiante/ElementosHorario';
import { Boton } from '../components/ui/Boton';
import { DialogoConfirmacion } from '../components/ui/DialogoConfirmacion';
import { useCarga } from '../hooks/useCarga';
import { ZONA_HORARIA } from '../utils/admin';
import { desvincularTelegram, mensajeDeError, obtenerTelegram } from '../services/estudiante';
import type { EstadoTelegramDTO } from '../types/perfil';

const TRAZO_TELEGRAM = 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z';
const TRAZO_CANDADO =
  'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4';

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null;

/** ISO 8601 → «1 de octubre de 2026». */
function formatearFechaHora(iso: string | null): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA_HORARIA,
  });
}

const estilosBoton =
  'inline-flex min-h-11 w-fit cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saie-primary disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Issue 3.28 — pantalla de avisos por Telegram. La vinculación se hace desde el bot (el alumno
 * envía su código y su clave en un mensaje); esta pantalla muestra el estado, las instrucciones
 * y permite desvincular la cuenta sin salir de SAIE.
 */
export const TelegramAlumnoPage: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerTelegram);
  // El estado local refleja la baja al instante; al reintentar se vuelve a leer del backend.
  const [estadoLocal, setEstadoLocal] = useState<EstadoTelegramDTO | null>(null);
  const estado = estadoLocal ?? datos;
  const [confirmando, setConfirmando] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  function reintentarCarga() {
    setEstadoLocal(null);
    recargar();
  }

  async function ejecutarBaja() {
    setDesvinculando(true);
    setMensaje(null);
    try {
      const nuevo = await desvincularTelegram();
      setEstadoLocal(nuevo);
      setConfirmando(false);
      setMensaje({
        tipo: 'ok',
        texto:
          'Listo, ya no recibirás avisos por Telegram. Puedes volver a vincularte cuando quieras.',
      });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setDesvinculando(false);
    }
  }

  const fechaVinculacion = formatearFechaHora(estado?.fechaVinculacion ?? null);
  const fechaBaja = formatearFechaHora(estado?.fechaBaja ?? null);

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <CabeceraPantalla
        titulo="Avisos por Telegram"
        subtitulo="Recibe un aviso cuando cambie el aula o el laboratorio de una de tus clases."
        trazoIcono={TRAZO_TELEGRAM}
        ancho="max-w-saie-lectura"
      />

      <main
        id={ID_CONTENIDO}
        tabIndex={-1}
        className="focus:outline-none mx-auto flex w-full max-w-saie-lectura flex-col gap-6 px-4 py-6"
      >
        {cargando && !estado ? (
          <EsqueletoCarga texto="Consultando tu vinculación…" />
        ) : error && !estado ? (
          <EstadoError
            mensaje={`No pudimos consultar tu vinculación. ${error}`}
            onReintentar={reintentarCarga}
          />
        ) : (
          estado && (
            <>
              {error && (
                <EstadoError
                  mensaje={`No pudimos actualizar tu vinculación. ${error}`}
                  onReintentar={reintentarCarga}
                />
              )}

              <section
                aria-labelledby="titulo-telegram"
                className="rounded-2xl border border-saie-divider bg-white p-5 shadow-saie-card sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saie-primary/10 text-saie-primary"
                    >
                      <Icono trazo={TRAZO_TELEGRAM} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 id="titulo-telegram" className="m-0 text-xl font-bold leading-7">
                        Tu cuenta de Telegram
                      </h2>
                      <p className="m-0 mt-1 text-sm text-saie-muted">
                        {estado.vinculado
                          ? 'Recibirás el aviso en cuanto cambie el aula o el laboratorio de una de tus clases.'
                          : 'Aún no recibes avisos por Telegram.'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      estado.vinculado
                        ? 'bg-saie-success-soft text-saie-success-strong'
                        : 'bg-saie-warning-soft text-saie-warning-strong'
                    }`}
                  >
                    <span aria-hidden="true">{estado.vinculado ? '✓' : '•'}</span>
                    {estado.vinculado ? 'Vinculado' : 'Sin vincular'}
                  </span>
                </div>

                <dl className="m-0 mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {fechaVinculacion && (
                    <div>
                      <dt className="text-saie-muted">Vinculado el</dt>
                      <dd className="m-0 font-medium text-saie-text">{fechaVinculacion}</dd>
                    </div>
                  )}
                  {!estado.vinculado && fechaBaja && (
                    <div>
                      <dt className="text-saie-muted">Última baja</dt>
                      <dd className="m-0 font-medium text-saie-text">{fechaBaja}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-5 border-t border-saie-divider pt-4">
                  {estado.vinculado ? (
                    <>
                      <Boton
                        variante="cancelar"
                        tamano="sm"
                        onClick={() => {
                          setMensaje(null);
                          setConfirmando(true);
                        }}
                      >
                        Desvincular mi Telegram
                      </Boton>
                      <DialogoConfirmacion
                        abierto={confirmando}
                        titulo="¿Dejar de recibir avisos por Telegram?"
                        descripcion="Podrás volver a vincularte cuando quieras."
                        textoConfirmar="Sí, desvincular"
                        variante="peligro"
                        cargando={desvinculando}
                        textoCargando="Desvinculando…"
                        onConfirmar={ejecutarBaja}
                        onCancelar={() => setConfirmando(false)}
                      />
                    </>
                  ) : estado.botUsername ? (
                    <a
                      href={`https://t.me/${estado.botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`${estilosBoton} bg-saie-primary text-white no-underline hover:bg-saie-primary-dark`}
                    >
                      Abrir el bot en Telegram
                    </a>
                  ) : (
                    <p className="m-0 text-sm text-saie-muted">
                      El enlace del bot no está configurado todavía. Pide a Coordinación el usuario
                      del bot.
                    </p>
                  )}
                </div>
              </section>

              {mensaje && (
                <div
                  role={mensaje.tipo === 'error' ? 'alert' : 'status'}
                  className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    mensaje.tipo === 'error'
                      ? 'bg-saie-danger-soft text-saie-danger-strong'
                      : 'bg-saie-success-soft text-saie-success-strong'
                  }`}
                >
                  <span aria-hidden="true">{mensaje.tipo === 'error' ? '⚠' : '✓'}</span>
                  <span className="min-w-0 flex-1">{mensaje.texto}</span>
                  {mensaje.tipo === 'error' && (
                    <button
                      type="button"
                      onClick={ejecutarBaja}
                      disabled={desvinculando}
                      className={`${estilosBoton} bg-saie-danger text-white hover:opacity-90`}
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}

              <section
                aria-labelledby="titulo-como-vincular"
                className="rounded-2xl border border-saie-divider bg-white p-5 shadow-saie-card sm:p-6"
              >
                <h2 id="titulo-como-vincular" className="m-0 text-xl font-bold leading-7">
                  Cómo vincular tu cuenta
                </h2>
                <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
                  <li className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saie-primary/10 text-xs font-bold text-saie-primary"
                    >
                      1
                    </span>
                    <p className="m-0 text-sm text-saie-text">
                      Abre el bot del SAIE en Telegram
                      {estado.botUsername && (
                        <>
                          {' ('}
                          <a
                            href={`https://t.me/${estado.botUsername}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-saie-primary underline underline-offset-2"
                          >
                            @{estado.botUsername}
                          </a>
                          {')'}
                        </>
                      )}
                      .
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saie-primary/10 text-xs font-bold text-saie-primary"
                    >
                      2
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 text-sm text-saie-text">
                        Envía en un solo mensaje tu código de alumno y tu clave, separados por un
                        espacio:
                      </p>
                      <code className="mt-2 inline-block rounded-lg bg-saie-canvas px-3 py-1.5 text-sm font-semibold text-saie-text">
                        22200101 miClave
                      </code>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saie-primary/10 text-xs font-bold text-saie-primary"
                    >
                      3
                    </span>
                    <p className="m-0 text-sm text-saie-text">
                      El bot borra el mensaje con tu clave y te confirma la vinculación.
                    </p>
                  </li>
                </ol>
                <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-saie-primary/5 p-3 text-sm text-saie-text">
                  <Icono
                    trazo={TRAZO_CANDADO}
                    className="mt-0.5 h-4 w-4 shrink-0 text-saie-primary"
                  />
                  <span>
                    Tu clave se usa solo para verificar tu identidad y el mensaje se borra del chat.
                  </span>
                </p>
              </section>

              <section
                aria-labelledby="titulo-comandos"
                className="rounded-2xl border border-saie-divider bg-white p-5 shadow-saie-card sm:p-6"
              >
                <h2 id="titulo-comandos" className="m-0 text-xl font-bold leading-7">
                  Qué puedes consultar en el bot
                </h2>
                <ul className="m-0 mt-3 grid list-none gap-2 p-0 text-sm sm:grid-cols-2">
                  <li>
                    <code className="font-semibold">/hoy</code> · Tus clases de hoy
                  </li>
                  <li>
                    <code className="font-semibold">/ahora</code> · Tu clase en curso o la siguiente
                  </li>
                  <li>
                    <code className="font-semibold">/horario</code> · Tu horario semanal
                  </li>
                  <li>
                    <code className="font-semibold">/baja</code> · Desvincular tu cuenta
                  </li>
                </ul>
              </section>
            </>
          )
        )}
      </main>
    </div>
  );
};

export default TelegramAlumnoPage;
