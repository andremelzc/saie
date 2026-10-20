import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  adoptarSesion,
  anunciarSesion,
  anunciarSesionCerrada,
  borrarSesion,
  guardarSesion,
  iniciarSincronizacionSesion,
  leerSesionAlmacenada,
  obtenerSesionValida,
  pedirSesionCompartida,
  registrarManejadorSincronizacion,
  type MensajeSesion,
  type Sesion,
} from './sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';

/**
 * jsdom no implementa `BroadcastChannel`. Se instala una doble muy simple que reparte los
 * mensajes entre todas las instancias del mismo "canal": basta para comprobar el protocolo
 * (preguntar, responder, adoptar y cerrar) sin depender del navegador.
 */
class CanalFalso {
  static instancias: CanalFalso[] = [];
  onmessage: ((evento: MessageEvent<MensajeSesion>) => void) | null = null;
  /** Nombre del canal: solo sirve para imitar la firma de `BroadcastChannel`. */
  readonly nombre: string;

  constructor(nombre: string) {
    this.nombre = nombre;
    CanalFalso.instancias.push(this);
  }

  postMessage(dato: MensajeSesion): void {
    for (const otro of CanalFalso.instancias) {
      if (otro === this) continue; // un canal no recibe sus propios mensajes
      otro.onmessage?.({ data: dato } as MessageEvent<MensajeSesion>);
    }
  }

  close(): void {
    CanalFalso.instancias = CanalFalso.instancias.filter((c) => c !== this);
  }
}

/** Una "pestaña" simulada: el módulo es único, así que la segunda se crea a mano. */
function pestañaSimulada(): { recibidos: MensajeSesion[]; canal: CanalFalso } {
  const recibidos: MensajeSesion[] = [];
  const canal = new CanalFalso('saie.sesion');
  canal.onmessage = (evento) => recibidos.push(evento.data);
  return { recibidos, canal };
}

const sesionDePrueba = (token: string): Sesion => ({
  token,
  rol: 'ALUMNO',
  debeCambiarClave: false,
});

describe('Sesión compartida entre pestañas (Issue 3.29)', () => {
  let detener: () => void = () => undefined;

  beforeEach(() => {
    borrarSesion();
    sessionStorage.clear();
    CanalFalso.instancias = [];
    vi.stubGlobal('BroadcastChannel', CanalFalso);
  });

  afterEach(() => {
    detener();
    detener = () => undefined;
    registrarManejadorSincronizacion(null);
    vi.unstubAllGlobals();
  });

  it('la pestaña que tiene sesión responde a la que la pide', () => {
    const token = crearToken(ahoraEnSegundos() + 3600);
    guardarSesion({ token, rol: 'ALUMNO', debeCambiarClave: false, expiresIn: '8h' });

    // Pestaña A: la del módulo, con sesión.
    detener = iniciarSincronizacionSesion();
    // Pestaña B: abre sin sesión y pregunta desde su propio canal.
    const otra = pestañaSimulada();
    otra.canal.postMessage({ tipo: 'peticion' });

    const respuestas = otra.recibidos.filter((m) => m.tipo === 'respuesta');
    expect(respuestas).toHaveLength(1);
    expect(respuestas[0]).toMatchObject({ tipo: 'respuesta', sesion: { token } });
  });

  it('la pestaña que abre sin sesión adopta la sesión que le responden', () => {
    const token = crearToken(ahoraEnSegundos() + 3600);
    guardarSesion({ token, rol: 'ALUMNO', debeCambiarClave: false, expiresIn: '8h' });

    // Pestaña A: la del módulo, con sesión.
    detener = iniciarSincronizacionSesion();

    // Pestaña B: la que se abre con control+clic. Pregunta y recibe la respuesta.
    const otra = pestañaSimulada();
    otra.canal.postMessage({ tipo: 'peticion' });

    const respuesta = otra.recibidos.find((m) => m.tipo === 'respuesta');
    expect(respuesta).toBeDefined();
    if (respuesta && respuesta.tipo === 'respuesta') {
      // La pestaña B guarda la sesión recibida en su propio sessionStorage.
      adoptarSesion(respuesta.sesion);
    }

    expect(leerSesionAlmacenada()?.token).toBe(token);
    expect(obtenerSesionValida().sesion?.token).toBe(token);
  });

  it('pedirSesionCompartida lanza la pregunta por el canal de esta pestaña', () => {
    detener = iniciarSincronizacionSesion();
    const otra = pestañaSimulada();

    pedirSesionCompartida();

    expect(otra.recibidos.some((m) => m.tipo === 'peticion')).toBe(true);
  });

  it('iniciar sesión en una pestaña se anuncia a las demás', () => {
    detener = iniciarSincronizacionSesion();
    const otra = pestañaSimulada();

    const token = crearToken(ahoraEnSegundos() + 3600);
    anunciarSesion(sesionDePrueba(token));

    const anuncio = otra.recibidos.find((m) => m.tipo === 'actualizada');
    expect(anuncio).toMatchObject({ tipo: 'actualizada', sesion: { token } });
  });

  it('cerrar sesión en una pestaña se propaga a las demás', () => {
    detener = iniciarSincronizacionSesion();
    const otra = pestañaSimulada();

    anunciarSesionCerrada();

    expect(otra.recibidos.some((m) => m.tipo === 'cerrada')).toBe(true);
  });

  it('sin BroadcastChannel el sistema sigue funcionando (degrada sin ruido)', () => {
    vi.unstubAllGlobals();
    // @ts-expect-error se simula un navegador sin BroadcastChannel
    delete globalThis.BroadcastChannel;

    expect(() => iniciarSincronizacionSesion()).not.toThrow();
    expect(() => pedirSesionCompartida()).not.toThrow();
    expect(() => anunciarSesion(sesionDePrueba('t'))).not.toThrow();
    expect(() => anunciarSesionCerrada()).not.toThrow();
  });

  it('la sesión sigue siendo solo de esta pestaña: adoptarla no la anuncia', () => {
    detener = iniciarSincronizacionSesion();
    const otra = pestañaSimulada();

    const token = crearToken(ahoraEnSegundos() + 3600);
    adoptarSesion(sesionDePrueba(token));

    expect(otra.recibidos).toHaveLength(0);
    expect(obtenerSesionValida().sesion?.token).toBe(token);
  });
});
