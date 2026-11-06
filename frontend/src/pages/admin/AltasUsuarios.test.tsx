import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AltaAlumnoPage from './AltaAlumnoPage';
import AltaDocentePage from './AltaDocentePage';
import { crearAlumno, crearDocente } from '../../services/admin';
import { esperarSinViolacionesGraves } from '../../test/axe';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  crearAlumno: vi.fn(),
  crearDocente: vi.fn(),
}));

const alta = vi.mocked(crearAlumno);
const altaDocente = vi.mocked(crearDocente);

const montar = (nodo: React.ReactNode) => render(<MemoryRouter>{nodo}</MemoryRouter>);

function escribir(etiqueta: RegExp | string, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

describe('AltaAlumnoPage (Issue 4.17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marca como obligatorios solo código, nombre y correo', () => {
    montar(<AltaAlumnoPage />);

    expect(screen.getByLabelText(/Código de alumno/)).toBeRequired();
    expect(screen.getByLabelText(/Nombre completo/)).toBeRequired();
    expect(screen.getByLabelText(/^Correo/)).toBeRequired();
    expect(screen.getByLabelText(/DNI/)).not.toBeRequired();
  });

  it('no llama al servidor con datos incompletos', () => {
    montar(<AltaAlumnoPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta al alumno' }));

    expect(alta).not.toHaveBeenCalled();
    expect(screen.getByText('El código del alumno es obligatorio.')).toBeVisible();
  });

  it('da de alta al alumno y explica cuál es su clave inicial', async () => {
    alta.mockResolvedValueOnce({
      id: 'a1',
      codigo: '20200001',
      nombre: 'Ana Pérez',
      rol: 'ALUMNO',
      debeCambiarClave: true,
    });
    montar(<AltaAlumnoPage />);

    escribir(/Código de alumno/, ' 20200001 ');
    escribir(/Nombre completo/, 'Ana Pérez');
    escribir(/^Correo/, 'ana@unmsm.pe');
    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta al alumno' }));

    expect(await screen.findByText(/Se dio de alta al alumno Ana Pérez/)).toBeVisible();
    expect(alta).toHaveBeenCalledWith({
      codigo: '20200001',
      nombre: 'Ana Pérez',
      correo: 'ana@unmsm.pe',
    });
    expect(screen.getByText(/primer ingreso/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta a otro alumno' }));
    expect(screen.getByLabelText(/Código de alumno/)).toHaveValue('');
  });

  it('muestra el mensaje del servidor si el código ya existe (409)', async () => {
    alta.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { success: false, message: "Ya existe un alumno o cuenta con el código '20200001'" },
      },
    });
    montar(<AltaAlumnoPage />);

    escribir(/Código de alumno/, '20200001');
    escribir(/Nombre completo/, 'Ana Pérez');
    escribir(/^Correo/, 'ana@unmsm.pe');
    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta al alumno' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un alumno');
    // El formulario conserva lo escrito para corregir el código.
    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue('Ana Pérez');
  });
});

describe('accesibilidad de las altas', () => {
  it('el formulario de alumno, vacío y con errores, no tiene violaciones graves', async () => {
    const { container } = montar(<AltaAlumnoPage />);
    await esperarSinViolacionesGraves(container, { nombre: 'AltaAlumnoPage' });

    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta al alumno' }));
    await esperarSinViolacionesGraves(container, { nombre: 'AltaAlumnoPage (con errores)' });
  });

  it('el formulario de docente, vacío y con errores, no tiene violaciones graves', async () => {
    const { container } = montar(<AltaDocentePage />);
    await esperarSinViolacionesGraves(container, { nombre: 'AltaDocentePage' });

    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta al docente' }));
    await esperarSinViolacionesGraves(container, { nombre: 'AltaDocentePage (con errores)' });
  });
});

describe('AltaDocentePage (Issue 4.18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exige los cuatro datos', () => {
    montar(<AltaDocentePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta al docente' }));

    expect(altaDocente).not.toHaveBeenCalled();
    expect(screen.getByText('El código del docente es obligatorio.')).toBeVisible();
    expect(screen.getByText('El departamento es obligatorio.')).toBeVisible();
  });

  it('da de alta al docente con todos sus datos', async () => {
    altaDocente.mockResolvedValueOnce({
      id: 'd1',
      codigo: 'D001',
      nombre: 'Luis Rojas',
      rol: 'DOCENTE',
      debeCambiarClave: true,
    });
    montar(<AltaDocentePage />);

    escribir(/Código de docente/, 'D001');
    escribir(/Nombre completo/, 'Luis Rojas');
    escribir(/Correo institucional/, 'lrojas@unmsm.pe');
    escribir(/Departamento académico/, 'Ingeniería de Software');
    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta al docente' }));

    await waitFor(() =>
      expect(altaDocente).toHaveBeenCalledWith({
        codigoDocente: 'D001',
        nombre: 'Luis Rojas',
        correoInstitucional: 'lrojas@unmsm.pe',
        departamento: 'Ingeniería de Software',
      }),
    );
    expect(await screen.findByText(/Se dio de alta al docente Luis Rojas/)).toBeVisible();
  });
});
