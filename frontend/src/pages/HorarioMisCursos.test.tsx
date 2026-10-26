import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HorarioMisCursos from './HorarioMisCursos';
import { AuthProvider } from '../context/AuthProvider';
import { guardarSesion } from '../services/sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';
import { CURSOS_FIXTURE, HORARIO_FIXTURE } from '../test/fixtures/horario';
import type { CursoMatriculadoDTO } from '../types/horario';

/** Martes 13/10/2026, 10:30 (hora local). */
const MARTES_10_30 = new Date(2026, 9, 13, 10, 30);

type Props = Partial<React.ComponentProps<typeof HorarioMisCursos>>;

function renderizar(props: Props = {}) {
  guardarSesion({
    token: crearToken(ahoraEnSegundos() + 3600, 'ALUMNO'),
    rol: 'ALUMNO',
    debeCambiarClave: false,
    expiresIn: '8h',
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <HorarioMisCursos
          horario={HORARIO_FIXTURE}
          cursos={CURSOS_FIXTURE}
          ahora={MARTES_10_30}
          {...props}
        />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('HorarioMisCursos (Issue #145 / 3.16)', () => {
  it('muestra el título, el periodo y los controles de sección', () => {
    renderizar();

    expect(
      screen.getByRole('heading', { level: 1, name: /Mi horario y mis cursos/i }),
    ).toBeVisible();
    expect(screen.getByText('Periodo 2026-II')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Horario' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mis cursos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  describe('vista diaria', () => {
    it('abre en el día actual con las clases en orden cronológico', () => {
      renderizar();

      expect(screen.getByRole('heading', { level: 3, name: 'Martes' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Martes, hoy, 3 clases' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      const clases = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
      expect(clases).toEqual(['Cálculo II', 'Física General', 'Bases de Datos']);
    });

    it('marca las clases como finalizada, en curso y próxima según la hora', () => {
      renderizar();

      expect(screen.getByText('Finalizada')).toBeVisible();
      expect(screen.getByText('En curso')).toBeVisible();
      expect(screen.getByText('Próxima')).toBeVisible();
    });

    it('muestra la hora, el docente y la ubicación de cada clase', () => {
      renderizar();

      expect(screen.getByText('Docente: Dr. Luis Paredes Vega')).toBeVisible();
      expect(screen.getByText('Aula teórica A-208')).toBeVisible();
      expect(screen.getByText('Laboratorio L-301')).toBeVisible();
      expect(screen.getByText('14:00')).toBeVisible();
      expect(screen.getByText('16:00')).toBeVisible();
    });

    it('cambia de día y muestra un estado vacío cuando no hay clases', () => {
      const soloMartes = {
        ...HORARIO_FIXTURE,
        dias: { MARTES: HORARIO_FIXTURE.dias.MARTES ?? [] },
      };
      renderizar({ horario: soloMartes });

      fireEvent.click(screen.getByRole('button', { name: /^Lunes/ }));
      expect(screen.getByRole('heading', { level: 3, name: 'Lunes' })).toBeVisible();
      expect(screen.getByText('No tienes clases el lunes')).toBeVisible();

      fireEvent.click(screen.getByRole('button', { name: 'Ir a hoy' }));
      expect(screen.getByRole('heading', { level: 3, name: 'Martes' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Ir a hoy' })).not.toBeInTheDocument();
    });
  });

  describe('vista semanal', () => {
    it('alterna a la semana con las columnas de lunes a sábado', () => {
      renderizar();

      fireEvent.click(screen.getByRole('button', { name: 'Semana' }));

      const grilla = screen.getByRole('region', { name: 'Horario semanal de lunes a sábado' });
      const dias = within(grilla).getAllByRole('region');
      expect(dias.map((d) => d.getAttribute('aria-label'))).toEqual([
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
      ]);
      expect(screen.queryByRole('group', { name: 'Seleccionar día de la semana' })).toBeNull();
    });

    it('muestra en cada bloque el curso, la sección, el tipo de espacio y el aula', () => {
      renderizar();

      fireEvent.click(screen.getByRole('button', { name: 'Semana' }));

      const martes = screen.getByRole('region', { name: 'Martes' });
      expect(within(martes).getByText('MA-201 · Sec. B')).toBeVisible();
      expect(within(martes).getByText('Teoría A-105')).toBeVisible();
      expect(within(martes).getByText('CC-305 · Sec. A')).toBeVisible();
      expect(within(martes).getByText('Lab. L-301')).toBeVisible();

      const viernes = screen.getByRole('region', { name: 'Viernes' });
      expect(within(viernes).getByText('Por asignar')).toBeVisible();
    });

    it('puede volver a la vista diaria', () => {
      renderizar();

      fireEvent.click(screen.getByRole('button', { name: 'Semana' }));
      fireEvent.click(screen.getByRole('button', { name: 'Día' }));

      expect(screen.getByRole('group', { name: 'Seleccionar día de la semana' })).toBeVisible();
    });
  });

  describe('mis cursos', () => {
    it('lista los cursos con docente, horarios y próximo espacio', () => {
      renderizar();

      fireEvent.click(screen.getByRole('button', { name: 'Mis cursos' }));

      expect(screen.getByText('6 cursos matriculados')).toBeVisible();

      const calculo = screen.getByRole('article', { name: 'Cálculo II' });
      expect(within(calculo).getByText('MA-201 · 1 sección · Periodo 2026-II')).toBeVisible();
      expect(within(calculo).getByText('Sección B')).toBeVisible();
      expect(within(calculo).getByText('Mg. Jorge Salazar Ruiz')).toBeVisible();
      expect(within(calculo).getByText('Mar 08:00 – 10:00')).toBeVisible();
      expect(within(calculo).getByText('Jue 08:00 – 10:00')).toBeVisible();
      expect(within(calculo).getByText('Martes, 08:00 – 10:00')).toBeVisible();
      expect(within(calculo).getByText('Aula teórica A-105')).toBeVisible();
    });

    it('agrupa las secciones de un mismo curso en un solo bloque', () => {
      const conLaboratorio: CursoMatriculadoDTO[] = [
        CURSOS_FIXTURE[1],
        {
          ...CURSOS_FIXTURE[1],
          codigoSeccion: 'B-LAB',
          espacios: [
            { id: 'esp-l301', identificador: 'L-301', tipo: 'LABORATORIO', pabellon: 'L', piso: 3 },
          ],
          estadoAsignacion: 'VIGENTE',
        },
      ];
      renderizar({ cursos: conLaboratorio });

      fireEvent.click(screen.getByRole('button', { name: 'Mis cursos' }));

      // Un solo curso (no dos secciones): el bloque es el curso.
      expect(screen.getByText('1 curso matriculado')).toBeVisible();
      const calculo = screen.getByRole('article', { name: 'Cálculo II' });
      expect(within(calculo).getByText('MA-201 · 2 secciones · Periodo 2026-II')).toBeVisible();
      expect(within(calculo).getByText('Sección B')).toBeVisible();
      expect(within(calculo).getByText('Sección B-LAB')).toBeVisible();
    });

    it('avisa cuando el espacio está pendiente o la asignación está en revisión', () => {
      renderizar();

      fireEvent.click(screen.getByRole('button', { name: 'Mis cursos' }));

      const redaccion = screen.getByRole('article', { name: 'Redacción y Comunicación' });
      expect(within(redaccion).getByText('Sin aula asignada')).toBeVisible();

      const software = screen.getByRole('article', { name: 'Ingeniería de Software' });
      expect(within(software).getByText('En revisión')).toBeVisible();
      expect(within(software).getByText('Por asignar')).toBeVisible();
    });

    it('muestra un estado vacío si no hay cursos matriculados', () => {
      renderizar({ cursos: [] });

      fireEvent.click(screen.getByRole('button', { name: 'Mis cursos' }));

      expect(screen.getByText('Aún no tienes cursos matriculados')).toBeVisible();
    });
  });

  describe('estados de la pantalla', () => {
    it('muestra el esqueleto mientras carga', () => {
      renderizar({ cargando: true });

      expect(screen.getByText('Cargando tu horario…')).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Tipo de vista del horario' })).toBeNull();
    });

    it('muestra el error con el botón «Reintentar»', () => {
      const onReintentar = vi.fn();
      renderizar({ error: 'Inténtalo de nuevo.', onReintentar });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar tu información. Inténtalo de nuevo.',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(onReintentar).toHaveBeenCalledTimes(1);
    });

    it('muestra un estado vacío si el horario no tiene clases', () => {
      renderizar({ horario: { periodo: '2026-II', vista: 'semana', dias: {} } });

      expect(screen.getByText('Aún no tienes clases programadas')).toBeVisible();
    });
  });
});
