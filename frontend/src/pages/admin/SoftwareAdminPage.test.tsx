import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SoftwareAdminPage from './SoftwareAdminPage';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  cambiarEstadoSoftwareCatalogo,
  crearSoftwareCatalogo,
  listarCatalogo,
} from '../../services/catalogoSoftware';
import type { SoftwareCatalogoDTO } from '../../types/catalogoSoftware';
import { admiteVersionMinima } from '../../utils/catalogoSoftware';

let rol = 'COORDINACION_ACADEMICA';
vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/catalogoSoftware', () => ({
  CLAVE_CATALOGO: 'catalogo-software',
  listarCatalogo: vi.fn(),
  crearSoftwareCatalogo: vi.fn(),
  editarSoftwareCatalogo: vi.fn(),
  cambiarEstadoSoftwareCatalogo: vi.fn(),
}));

const listar = vi.mocked(listarCatalogo);
const crear = vi.mocked(crearSoftwareCatalogo);
const cambiarEstado = vi.mocked(cambiarEstadoSoftwareCatalogo);

const sw = (o: Partial<SoftwareCatalogoDTO> = {}): SoftwareCatalogoDTO => ({
  id: 'sw1',
  nombre: 'Python',
  version: '3.12',
  categoria: 'LENGUAJE',
  tipoLicencia: 'LIBRE',
  descripcion: null,
  fabricante: 'PSF',
  activo: true,
  fechaCreacion: '2026-10-01T10:00:00Z',
  uso: { laboratorios: 2, secciones: 5 },
  ...o,
});

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <SoftwareAdminPage />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Catálogo de software (Issue 4.30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    rol = 'COORDINACION_ACADEMICA';
    listar.mockResolvedValue({ items: [sw()], total: 1, page: 1, limit: 50 });
  });

  it('lista el software con su categoría, licencia y uso', async () => {
    montar();
    expect((await screen.findAllByText('Python 3.12')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 laboratorios · 5 secciones/).length).toBeGreaterThan(0);
    expect(listar).toHaveBeenCalledWith(expect.objectContaining({ activo: true }));
  });

  it('filtra por categoría y por estado (activo o de baja)', async () => {
    montar();
    await screen.findAllByText('Python 3.12');
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'IDE' } });
    await waitFor(() =>
      expect(listar).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'IDE' })),
    );
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'BAJA' } });
    await waitFor(() =>
      expect(listar).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: 'IDE', activo: false }),
      ),
    );
  });

  it('dar de baja avisa cuántos laboratorios y secciones lo usan', async () => {
    cambiarEstado.mockResolvedValue(sw({ activo: false }));
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Dar de baja Python 3.12/ }))[0]);

    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo).toHaveTextContent('2 laboratorios · 5 secciones');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sí, dar de baja' }));
    await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith('sw1', false));
  });

  it('el alta valida los campos y envía el software nuevo', async () => {
    crear.mockResolvedValue(sw({ id: 'sw2', nombre: 'Docker', version: '' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar software' }));
    const panel = await screen.findByRole('dialog', { name: 'Agregar software' });

    fireEvent.click(within(panel).getByRole('button', { name: 'Agregar al catálogo' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent('Corrige 2 datos');
    expect(within(panel).getByLabelText(/^Nombre/)).toHaveFocus();
    expect(crear).not.toHaveBeenCalled();

    fireEvent.change(within(panel).getByLabelText(/^Nombre/), { target: { value: 'Docker' } });
    fireEvent.change(within(panel).getByLabelText(/^Categoría/), { target: { value: 'OTRO' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Agregar al catálogo' }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        nombre: 'Docker',
        version: '',
        categoria: 'OTRO',
        tipoLicencia: 'LIBRE',
      }),
    );
  });

  it('en edición la versión no se puede cambiar', async () => {
    montar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Editar Python 3.12/ }))[0]);
    const panel = await screen.findByRole('dialog', { name: /Editar software/ });
    expect(within(panel).getByLabelText('Versión')).toBeDisabled();
  });

  it('Jefatura consulta el catálogo sin controles de alta, edición ni baja', async () => {
    rol = 'JEFATURA_LABORATORIOS';
    montar();
    await screen.findAllByText('Python 3.12');
    expect(screen.queryByRole('button', { name: 'Agregar software' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Dar de baja/ })).toBeNull();
  });

  it('la versión mínima solo se permite con versiones numéricas', () => {
    expect(admiteVersionMinima('3.12')).toBe(true);
    expect(admiteVersionMinima('2024.1')).toBe(true);
    expect(admiteVersionMinima('R2023b')).toBe(false);
    expect(admiteVersionMinima('')).toBe(false);
  });
});
