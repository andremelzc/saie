import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormularioBusqueda } from './FormularioBusqueda';
import { detectarTipoCodigo } from '../../utils/consulta';
import api from '../../services/api';
import type { ConsultaAlumnoResponseDTO, ConsultaCursoResponseDTO } from '../../types/consulta';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
  api: {
    get: vi.fn(),
  },
}));

describe('detectarTipoCodigo (Issue #134 / 3.5)', () => {
  it('detecta correctamente un código de alumno de 8 dígitos', () => {
    expect(detectarTipoCodigo('20200001')).toBe('ALUMNO');
    expect(detectarTipoCodigo('22200101')).toBe('ALUMNO');
  });

  it('detecta correctamente un código de curso con letras, números y guion', () => {
    expect(detectarTipoCodigo('CC-101')).toBe('CURSO');
    expect(detectarTipoCodigo('SI-201')).toBe('CURSO');
    expect(detectarTipoCodigo('is-301')).toBe('CURSO');
  });

  it('rechaza entradas vacías, con espacios o longitudes incorrectas', () => {
    expect(detectarTipoCodigo('')).toBeNull();
    expect(detectarTipoCodigo('   ')).toBeNull();
    expect(detectarTipoCodigo('2020 0001')).toBeNull();
    expect(detectarTipoCodigo('CC 101')).toBeNull();
    expect(detectarTipoCodigo('1234567')).toBeNull(); // 7 dígitos
    expect(detectarTipoCodigo('123456789')).toBeNull(); // 9 dígitos
    expect(detectarTipoCodigo('ALUMNO')).toBeNull();
    expect(detectarTipoCodigo('CC--101')).toBeNull();
  });
});

describe('FormularioBusqueda (Issue #134 / 3.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente el campo accesible y botón deshabilitado al inicio', () => {
    render(<FormularioBusqueda />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Ej. 20200001 o CC-101');
    expect(boton).toBeDisabled();

    // Texto de ayuda en 14 px (text-sm) visible inicialmente
    expect(
      screen.getByText(
        'Ingresa tu código de alumno (8 dígitos, ej: 20200001) o código de curso (ej: CC-101).',
      ),
    ).toBeInTheDocument();
  });

  it('mantiene el botón deshabilitado con formatos inválidos y lo habilita con código válido', () => {
    render(<FormularioBusqueda />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    // Entrada inválida: solo 4 números
    fireEvent.change(input, { target: { value: '1234' } });
    expect(boton).toBeDisabled();

    // Entrada inválida: contiene espacios
    fireEvent.change(input, { target: { value: '2020 0001' } });
    expect(boton).toBeDisabled();

    // Entrada válida de alumno (8 dígitos)
    fireEvent.change(input, { target: { value: '20200001' } });
    expect(boton).not.toBeDisabled();
    expect(screen.getByText('Estudiante detectado')).toBeInTheDocument();

    // Entrada válida de curso (CC-101)
    fireEvent.change(input, { target: { value: 'CC-101' } });
    expect(boton).not.toBeDisabled();
    expect(screen.getByText('Curso detectado')).toBeInTheDocument();
  });

  it('no muestra error de formato mientras el usuario escribe, pero sí al salir del campo (onBlur)', () => {
    render(<FormularioBusqueda />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);

    // Usuario escribe formato incompleto: no debe haber alerta visible aún
    fireEvent.change(input, { target: { value: '12345' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Usuario sale del campo (onBlur): debe aparecer el mensaje con icono
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa 8 dígitos (alumno) o un código de curso como CC-101'),
    ).toBeInTheDocument();

    // Si el usuario vuelve a escribir, el error desaparece inmediatamente
    fireEvent.change(input, { target: { value: '123456' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra mensaje de error de formato al intentar enviar con formato inválido', () => {
    render(<FormularioBusqueda />);

    const form = screen.getByLabelText('Formulario de consulta de espacios');
    const input = screen.getByLabelText(/Código de alumno o curso/i);

    fireEvent.change(input, { target: { value: 'ABC' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Intento de envío del formulario
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa 8 dígitos (alumno) o un código de curso como CC-101'),
    ).toBeInTheDocument();
  });

  it('consulta endpoint de alumno cuando el código es de 8 dígitos y ejecuta onBuscar', async () => {
    const mockAlumnoData: ConsultaAlumnoResponseDTO = {
      alumno: {
        codigo: '20200001',
        nombre: 'Valeria López',
        correo: 'valeria.lopez@unmsm.edu.pe',
        movilidadReducida: false,
      },
      asignaciones: [],
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockAlumnoData },
    });

    const onBuscarMock = vi.fn();
    render(<FormularioBusqueda onBuscar={onBuscarMock} />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(input, { target: { value: '20200001' } });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v1/consulta/alumno/20200001');
    });

    expect(onBuscarMock).toHaveBeenCalledWith(
      { tipo: 'ALUMNO', datos: mockAlumnoData },
      '20200001',
      'ALUMNO',
    );
  });

  it('consulta endpoint de curso cuando el código tiene guion y normaliza a mayúsculas', async () => {
    const mockCursoData: ConsultaCursoResponseDTO = {
      curso: {
        codigo: 'CC-101',
        nombre: 'Ciencias de la Computación I',
      },
      secciones: [],
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockCursoData },
    });

    const onBuscarMock = vi.fn();
    render(<FormularioBusqueda onBuscar={onBuscarMock} />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(input, { target: { value: 'cc-101' } });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v1/consulta/curso/CC-101');
    });

    expect(onBuscarMock).toHaveBeenCalledWith(
      { tipo: 'CURSO', datos: mockCursoData },
      'CC-101',
      'CURSO',
    );
  });

  it('muestra mensaje de error cuando el backend responde 404', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          success: false,
          message: 'No se encontró ningún estudiante con el código 20200001',
        },
      },
    });

    const onErrorMock = vi.fn();
    render(<FormularioBusqueda onError={onErrorMock} />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(input, { target: { value: '20200001' } });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText('No se encontró ningún estudiante con el código 20200001'),
    ).toBeInTheDocument();
    expect(onErrorMock).toHaveBeenCalledWith(
      'No se encontró ningún estudiante con el código 20200001',
    );

    // Al volver a escribir, el error debe desaparecer
    fireEvent.change(input, { target: { value: '20200002' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
