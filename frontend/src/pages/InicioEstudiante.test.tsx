import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InicioEstudiante from './InicioEstudiante';
import api from '../services/api';
import { DIAS_LECTIVOS, ETIQUETA_DIA } from '../utils/horario';
import type { HorarioSemanalDTO, SesionDTO } from '../types/horario';

const auth = vi.hoisted(() => ({ sesion: { rol: 'ESTUDIANTE' } as { rol: string } | null }));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: auth.sesion }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

// 2026-10-19 es lunes y 2026-10-21 es miércoles. Solo se congela Date: los timers siguen reales
// para que findBy/waitFor funcionen sin trucos.
const lunesA = (hora: number, minuto = 0) => new Date(2026, 9, 19, hora, minuto);
const miercolesA = (hora: number) => new Date(2026, 9, 21, hora);

const LUNES = DIAS_LECTIVOS[0];
const MARTES = DIAS_LECTIVOS[1];
const VIERNES = DIAS_LECTIVOS[4];

function sesion(
  codigoCurso: string,
  nombreCurso: string,
  horaInicio: string,
  horaFin: string,
): SesionDTO {
  return {
    seccionId: `${codigoCurso}-A`,
    codigoCurso,
    nombreCurso,
    horaInicio,
    horaFin,
    espacios: [],
  } as unknown as SesionDTO;
}

function horarioCon(dias: Record<string, SesionDTO[]>): HorarioSemanalDTO {
  return { periodo: '2026-2', vista: 'semana', dias } as unknown as HorarioSemanalDTO;
}

function responder(horario: HorarioSemanalDTO) {
  return vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true, data: horario } } as never);
}

function montar() {
  return render(
    <MemoryRouter>
      <InicioEstudiante />
    </MemoryRouter>,
  );
}

describe('InicioEstudiante', () => {
  beforeEach(() => {
    auth.sesion = { rol: 'ESTUDIANTE' };
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(lunesA(10));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('sin horario disponible', () => {
    it('mientras carga muestra los accesos y no afirma nada sobre las clases, sin resumen', () => {
      vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}) as never);
      montar();

      // Hasta que llegue el horario no se sabe si hay clases hoy.
      expect(screen.queryByText('Hoy no tienes clases')).toBeNull();
      expect(
        screen.getByRole('navigation', { name: 'Secciones del portal del estudiante' }),
      ).toBeVisible();
      expect(screen.queryByText('clases por semana')).toBeNull();
    });

    it('si la API falla, sigue mostrando los accesos a horario y perfil', async () => {
      const get = vi.spyOn(api, 'get').mockRejectedValue(new Error('caída'));
      montar();

      await waitFor(() => expect(get).toHaveBeenCalled());
      expect(await screen.findByRole('link', { name: /Mi horario/ })).toBeVisible();
      expect(screen.getByRole('link', { name: /Mi perfil/ })).toBeVisible();
      expect(screen.queryByText('clases por semana')).toBeNull();
    });

    it('si la API falla, avisa del error y permite reintentar', async () => {
      const get = vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('caída'));
      montar();

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('No pudimos cargar tu horario.');

      // El reintento vuelve a pedir el horario y, si responde, la pantalla se recupera.
      responder(horarioCon({ [LUNES]: [sesion('MAT101', 'Matemática I', '09:00', '11:00')] }));
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByText('Clase en curso')).toBeVisible();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('si el horario llega vacío, avisa en vez de mostrar una pantalla en blanco', async () => {
      vi.spyOn(api, 'get').mockRejectedValue(new Error('caída'));
      montar();

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('No pudimos cargar tu horario.');
      // Aun sin horario, los accesos a las demás pantallas siguen disponibles.
      expect(screen.getByRole('link', { name: /Mi horario/ })).toBeVisible();
    });

    it('si el reintento también falla, vuelve a avisar sin romper la pantalla', async () => {
      vi.spyOn(api, 'get').mockRejectedValue(new Error('caída'));
      montar();

      const alerta = await screen.findByRole('alert');
      fireEvent.click(within(alerta).getByRole('button', { name: 'Reintentar' }));

      // Sigue habiendo un aviso y la pantalla no se queda a medio cargar.
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      expect(screen.getByRole('link', { name: /Mi horario/ })).toBeVisible();
    });

    it('con el horario vacío muestra el periodo pero no resumen ni semana', async () => {
      responder(horarioCon({}));
      montar();

      expect(await screen.findByText('Periodo lectivo 2026-2')).toBeVisible();
      expect(screen.queryByText('clases por semana')).toBeNull();
      expect(screen.queryByText('Tu semana de un vistazo')).toBeNull();
    });

    it('sin sesión de usuario no falla al pintar la cabecera', () => {
      auth.sesion = null;
      vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}) as never);
      montar();

      expect(screen.getByText('Estudiante')).toBeVisible();
    });

    it('si el componente se desmonta antes de la respuesta, no actualiza el estado', async () => {
      let resolver: (valor: unknown) => void = () => {};
      const get = vi.spyOn(api, 'get').mockReturnValue(
        new Promise((resolve) => {
          resolver = resolve;
        }) as never,
      );
      const { unmount } = montar();
      await waitFor(() => expect(get).toHaveBeenCalled());

      unmount();
      await act(async () => {
        resolver({ data: { success: true, data: horarioCon({}) } });
      });

      expect(get).toHaveBeenCalledTimes(1);
    });
  });

  describe('con clases hoy (lunes)', () => {
    it('clase en curso: la destaca, la lista en «Tu día de hoy» y marca hoy en la semana', async () => {
      vi.setSystemTime(lunesA(10));
      responder(horarioCon({ [LUNES]: [sesion('MAT101', 'Matemática I', '09:00', '11:00')] }));
      montar();

      expect(await screen.findByText('Clase en curso')).toBeVisible();
      expect(screen.getByRole('region', { name: 'Tu próxima clase' })).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Tu día de hoy' })).toBeVisible();
      expect(screen.getByText('Tu semana de un vistazo')).toBeVisible();
      expect(
        screen.getByRole('link', { name: `${ETIQUETA_DIA[LUNES]}, hoy, 1 clase` }),
      ).toBeVisible();
      expect(screen.getByRole('link', { name: `${ETIQUETA_DIA[MARTES]}, 0 clases` })).toBeVisible();
    });

    it('clase aún no iniciada: muestra «Tu próxima clase» sin barra de progreso', async () => {
      vi.setSystemTime(lunesA(8));
      responder(horarioCon({ [LUNES]: [sesion('MAT101', 'Matemática I', '10:00', '12:00')] }));
      montar();

      const tarjeta = await screen.findByRole('region', { name: 'Tu próxima clase' });
      expect(tarjeta).toBeVisible();
      expect(screen.queryByText('Clase en curso')).toBeNull();
    });

    it('resumen en singular con una clase, un curso y un día', async () => {
      responder(horarioCon({ [LUNES]: [sesion('MAT101', 'Matemática I', '09:00', '11:00')] }));
      montar();

      expect(await screen.findByText('clase por semana')).toBeVisible();
      expect(screen.getByText('curso matriculado')).toBeVisible();
      expect(screen.getByText('día con clases')).toBeVisible();
      expect(screen.getByText('de clase a la semana')).toBeVisible();
    });

    it('resumen en plural con varios cursos y días', async () => {
      responder(
        horarioCon({
          [LUNES]: [sesion('MAT101', 'Matemática I', '09:00', '11:00')],
          [MARTES]: [sesion('FIS101', 'Física I', '09:00', '11:00')],
        }),
      );
      montar();

      expect(await screen.findByText('clases por semana')).toBeVisible();
      expect(screen.getByText('cursos matriculados')).toBeVisible();
      expect(screen.getByText('días con clases')).toBeVisible();
    });

    it('con varias clases en el día cuenta «N clases» en la tira semanal', async () => {
      responder(
        horarioCon({
          [LUNES]: [
            sesion('MAT101', 'Matemática I', '08:00', '09:00'),
            sesion('FIS101', 'Física I', '10:00', '11:00'),
          ],
        }),
      );
      montar();

      expect(
        await screen.findByRole('link', { name: `${ETIQUETA_DIA[LUNES]}, hoy, 2 clases` }),
      ).toBeVisible();
    });

    it('al pasar el minuto actualiza la hora y la clase pasa a «en curso»', async () => {
      vi.setSystemTime(lunesA(9, 0));
      const intervalo = vi.spyOn(globalThis, 'setInterval');
      responder(horarioCon({ [LUNES]: [sesion('MAT101', 'Matemática I', '10:00', '11:00')] }));
      montar();

      expect(await screen.findByRole('region', { name: 'Tu próxima clase' })).toBeVisible();
      expect(screen.queryByText('Clase en curso')).toBeNull();

      const llamada = intervalo.mock.calls.find(([, ms]) => ms === 60_000);
      const tic = llamada?.[0];
      if (typeof tic !== 'function') throw new Error('No se registró el temporizador de 1 minuto');

      vi.setSystemTime(lunesA(10, 30));
      act(() => {
        tic();
      });

      expect(await screen.findByText('Clase en curso')).toBeVisible();
    });
  });

  describe('sin clases pendientes hoy', () => {
    it('ya terminaron las de hoy: anuncia las siguientes del próximo día', async () => {
      vi.setSystemTime(lunesA(15));
      responder(
        horarioCon({
          [LUNES]: [sesion('MAT101', 'Matemática I', '08:00', '10:00')],
          [MARTES]: [sesion('FIS101', 'Física I', '09:00', '11:00')],
        }),
      );
      montar();

      expect(await screen.findByText('Ya terminaron tus clases de hoy')).toBeVisible();
      expect(screen.getByText(/Lo siguiente:/)).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Tu día de hoy' })).toBeVisible();
      expect(screen.queryByText(/Lo que viene el/)).toBeNull();
    });

    it('hoy no hay clases pero sí otro día: muestra lo que viene', async () => {
      vi.setSystemTime(miercolesA(10));
      responder(horarioCon({ [VIERNES]: [sesion('QUI101', 'Química I', '09:00', '11:00')] }));
      montar();

      expect(await screen.findByText('Hoy no tienes clases')).toBeVisible();
      expect(screen.getByText(/Lo siguiente:/)).toBeVisible();
      expect(
        screen.getByRole('heading', {
          name: `Lo que viene el ${ETIQUETA_DIA[VIERNES].toLowerCase()}`,
        }),
      ).toBeVisible();
      expect(screen.getByText('Química I', { selector: 'span' })).toBeVisible();
      expect(screen.getByRole('link', { name: /Mi horario/ })).toBeVisible();
    });
  });
});
