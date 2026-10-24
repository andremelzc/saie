import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import AppRoutes from '../../AppRoutes';
import api from '../../services/api';
import { ordenarAlertasPorFecha } from '../../services/admin';
import { borrarSesion, guardarSesion } from '../../services/sesion';
import TarjetaAlerta from '../../components/admin/TarjetaAlerta';
import { ahoraEnSegundos, crearToken } from '../../test/helpers';
import type { AlertaDTO } from '../../types/admin';

const base: AlertaDTO = {
  id: 'a1',
  tipo: 'SOFTWARE',
  estado: 'PENDIENTE',
  motivo: 'Falta MATLAB R2024a',
  fechaDeteccion: '2026-10-10T10:00:00.000Z',
  espacio: { id: 'e1', identificador: 'LAB-301', pabellon: 'A', piso: 3 },
  asignacionesAfectadas: [
    { asignacionId: 's1', codigoCurso: 'IS101', nombreCurso: 'Algoritmos', codigoSeccion: '01' },
  ],
};

describe('Tarjeta de alerta (Issue 4.9)', () => {
  it('muestra laboratorio, tipo, motivo, cursos afectados, fecha y estado', () => {
    render(<TarjetaAlerta alerta={base} onResolver={() => {}} />);
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Falta MATLAB R2024a')).toBeInTheDocument();
    expect(screen.getByText(/IS101 · 01/)).toBeInTheDocument();
    expect(screen.getByText(/Detectada el/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('distingue visualmente software de capacidad', () => {
    const { container } = render(
      <>
        <TarjetaAlerta alerta={base} />
        <TarjetaAlerta alerta={{ ...base, id: 'a2', tipo: 'CAPACIDAD' }} />
      </>,
    );
    const [sw, cap] = container.querySelectorAll('article');
    expect(sw.className).not.toEqual(cap.className);
  });

  it('pide confirmación y expone la acción solo si está pendiente', () => {
    const onResolver = vi.fn();
    const { rerender } = render(<TarjetaAlerta alerta={base} onResolver={onResolver} />);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como resuelta' }));
    expect(onResolver).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, resolver' }));
    expect(onResolver).toHaveBeenCalledWith('a1');
    rerender(<TarjetaAlerta alerta={{ ...base, estado: 'RESUELTA' }} onResolver={onResolver} />);
    expect(screen.queryByRole('button', { name: 'Marcar como resuelta' })).toBeNull();
  });
});

describe('Lista de alertas (Issue 4.10)', () => {
  beforeEach(() => {
    borrarSesion();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('ordena por fecha, de la más reciente a la más antigua', () => {
    const vieja = { ...base, id: 'v', fechaDeteccion: '2026-01-01T00:00:00Z' };
    const nueva = { ...base, id: 'n', fechaDeteccion: '2026-09-01T00:00:00Z' };
    expect(ordenarAlertasPorFecha([vieja, nueva]).map((a) => a.id)).toEqual(['n', 'v']);
  });

  it('sin sesión no muestra la lista (redirige al login)', () => {
    render(
      <MemoryRouter initialEntries={['/admin/alertas']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('heading', { name: 'Centro de alertas' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Panel Administrativo' })).toBeInTheDocument();
  });

  it('marcar como resuelta llama al backend y actualiza sin recargar', async () => {
    guardarSesion({
      token: crearToken(ahoraEnSegundos() + 3600, 'COORDINACION_ACADEMICA'),
      rol: 'COORDINACION_ACADEMICA',
      debeCambiarClave: false,
      expiresIn: '8h',
    });
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [base] } } as never);
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true } } as never);

    render(
      <MemoryRouter initialEntries={['/admin/alertas']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const tarjeta = await screen.findByRole('article');
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Marcar como resuelta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, resolver' }));

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/v1/admin/alertas/a1/resolver'));
    expect(await screen.findByText('Alerta de LAB-301 marcada como resuelta.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('article')).toBeNull());
  });

  it('muestra el contador global y filtra por tipo con sus conteos', async () => {
    guardarSesion({
      token: crearToken(ahoraEnSegundos() + 3600, 'COORDINACION_ACADEMICA'),
      rol: 'COORDINACION_ACADEMICA',
      debeCambiarClave: false,
      expiresIn: '8h',
    });
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [base, { ...base, id: 'a2', tipo: 'CAPACIDAD', motivo: 'Aforo excedido' }],
      },
    } as never);

    render(
      <MemoryRouter initialEntries={['/admin/alertas']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /Todas \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Software \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capacidad \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText(/pendientes/)).toHaveTextContent('2 pendientes');

    fireEvent.click(screen.getByRole('button', { name: /Software \(1\)/ }));
    expect(screen.getByRole('article', { name: /software/i })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /capacidad/i })).toBeNull();
  });

  it('muestra el error al resolver y permite reintentar la acción', async () => {
    guardarSesion({
      token: crearToken(ahoraEnSegundos() + 3600, 'COORDINACION_ACADEMICA'),
      rol: 'COORDINACION_ACADEMICA',
      debeCambiarClave: false,
      expiresIn: '8h',
    });
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [base] } } as never);
    const patch = vi
      .spyOn(api, 'patch')
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce({ data: { success: true } } as never);

    render(
      <MemoryRouter initialEntries={['/admin/alertas']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const tarjeta = await screen.findByRole('article');
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Marcar como resuelta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, resolver' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Inténtalo de nuevo en unos minutos.');
    fireEvent.click(within(aviso).getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Alerta de LAB-301 marcada como resuelta.')).toBeInTheDocument();
  });
});
