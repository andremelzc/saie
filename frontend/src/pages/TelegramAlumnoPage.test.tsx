import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TelegramAlumnoPage from './TelegramAlumnoPage';
import { desvincularTelegram, obtenerTelegram } from '../services/estudiante';
import type { EstadoTelegramDTO } from '../types/perfil';

vi.mock('../services/estudiante', () => ({
  obtenerTelegram: vi.fn(),
  desvincularTelegram: vi.fn(),
  mensajeDeError: () => 'Inténtalo de nuevo en unos minutos.',
}));

const obtener = vi.mocked(obtenerTelegram);
const baja = vi.mocked(desvincularTelegram);

const estado = (cambios: Partial<EstadoTelegramDTO> = {}): EstadoTelegramDTO => ({
  vinculado: false,
  fechaVinculacion: null,
  fechaBaja: null,
  botUsername: 'saie_bot',
  ...cambios,
});

const montar = () =>
  render(
    <MemoryRouter>
      <TelegramAlumnoPage />
    </MemoryRouter>,
  );

describe('TelegramAlumnoPage', () => {
  beforeEach(() => {
    obtener.mockReset();
    baja.mockReset();
  });

  it('sin vincular: explica los pasos y enlaza al bot', async () => {
    obtener.mockResolvedValue(estado());
    montar();

    expect(await screen.findByText('Sin vincular')).toBeInTheDocument();
    expect(screen.getByText('22200101 miClave')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir el bot en Telegram/ })).toHaveAttribute(
      'href',
      'https://t.me/saie_bot',
    );
  });

  it('vinculado: confirma la baja y refleja el nuevo estado', async () => {
    obtener.mockResolvedValue(
      estado({ vinculado: true, fechaVinculacion: '2026-10-01T12:00:00.000Z' }),
    );
    baja.mockResolvedValue(estado({ fechaBaja: '2026-10-19T18:00:00.000Z' }));
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular mi Telegram' }));
    expect(
      screen.getByRole('alertdialog', { name: /Dejar de recibir avisos/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, desvincular' }));

    await waitFor(() => expect(baja).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Sin vincular')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/ya no recibirás avisos/);
  });

  it('permite cancelar la confirmación sin desvincular', async () => {
    obtener.mockResolvedValue(estado({ vinculado: true }));
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular mi Telegram' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog', { name: /Dejar de recibir avisos/ })).toBeNull();
    expect(baja).not.toHaveBeenCalled();
  });

  it('muestra el error de consulta y permite reintentar', async () => {
    obtener.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(estado());
    montar();

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/No pudimos consultar tu vinculación/);
    fireEvent.click(within(aviso).getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(obtener).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Sin vincular')).toBeInTheDocument();
  });

  it('si la baja falla, muestra el error y permite reintentarla', async () => {
    obtener.mockResolvedValue(estado({ vinculado: true }));
    baja.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(estado());
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular mi Telegram' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, desvincular' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Inténtalo de nuevo en unos minutos.');
    fireEvent.click(within(aviso).getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(baja).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Sin vincular')).toBeInTheDocument();
  });

  it('sin usuario de bot configurado, pide el enlace a Coordinación', async () => {
    obtener.mockResolvedValue(estado({ botUsername: null }));
    montar();

    expect(await screen.findByText(/no está configurado todavía/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Abrir el bot en Telegram/ })).toBeNull();
  });
});
