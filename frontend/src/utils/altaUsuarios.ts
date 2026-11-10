import type { NuevoAlumnoDTO, NuevoDocenteDTO } from '../types/admin';

/** Longitud máxima de los textos que acepta el backend (Issues 4.17 y 4.18). */
export const MAXIMO_TEXTO = 200;
export const MAXIMO_CODIGO = 20;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FormularioAlumno {
  codigo: string;
  nombre: string;
  correo: string;
  dni: string;
  telefono: string;
  direccion: string;
  fechaNacimiento: string;
}

export interface FormularioDocente {
  codigoDocente: string;
  nombre: string;
  correoInstitucional: string;
  departamento: string;
}

export const ALUMNO_VACIO: FormularioAlumno = {
  codigo: '',
  nombre: '',
  correo: '',
  dni: '',
  telefono: '',
  direccion: '',
  fechaNacimiento: '',
};

export const DOCENTE_VACIO: FormularioDocente = {
  codigoDocente: '',
  nombre: '',
  correoInstitucional: '',
  departamento: '',
};

type Errores<T> = Partial<Record<keyof T, string>>;

function textoObligatorio(
  valor: string,
  nombre: string,
  maximo = MAXIMO_TEXTO,
): string | undefined {
  const limpio = valor.trim();
  if (limpio === '') return `${nombre} es obligatorio.`;
  if (limpio.length > maximo) return `${nombre} no puede superar los ${maximo} caracteres.`;
  return undefined;
}

function correoValido(valor: string, nombre: string): string | undefined {
  const limpio = valor.trim();
  if (limpio === '') return `${nombre} es obligatorio.`;
  if (!CORREO.test(limpio)) return `${nombre} no tiene un formato válido (usuario@dominio.pe).`;
  if (limpio.length > MAXIMO_TEXTO) return `${nombre} es demasiado largo.`;
  return undefined;
}

function textoOpcional(valor: string, nombre: string): string | undefined {
  return valor.trim().length > MAXIMO_TEXTO
    ? `${nombre} no puede superar los ${MAXIMO_TEXTO} caracteres.`
    : undefined;
}

/** Hoy en formato `AAAA-MM-DD`, en la zona horaria local (no la UTC de `toISOString`). */
export function hoyIso(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

function sinErrores<T>(errores: Errores<T>): Errores<T> {
  return Object.fromEntries(Object.entries(errores).filter(([, v]) => v)) as Errores<T>;
}

export function validarAlumno(
  f: FormularioAlumno,
  hoy: string = hoyIso(),
): Errores<FormularioAlumno> {
  return sinErrores<FormularioAlumno>({
    codigo: textoObligatorio(f.codigo, 'El código del alumno', MAXIMO_CODIGO),
    nombre: textoObligatorio(f.nombre, 'El nombre'),
    correo: correoValido(f.correo, 'El correo'),
    dni: textoOpcional(f.dni, 'El DNI'),
    telefono: textoOpcional(f.telefono, 'El teléfono'),
    direccion: textoOpcional(f.direccion, 'La dirección'),
    fechaNacimiento:
      f.fechaNacimiento !== '' && f.fechaNacimiento > hoy
        ? 'La fecha de nacimiento no puede ser futura.'
        : undefined,
  });
}

export function validarDocente(f: FormularioDocente): Errores<FormularioDocente> {
  return sinErrores<FormularioDocente>({
    codigoDocente: textoObligatorio(f.codigoDocente, 'El código del docente', MAXIMO_CODIGO),
    nombre: textoObligatorio(f.nombre, 'El nombre'),
    correoInstitucional: correoValido(f.correoInstitucional, 'El correo institucional'),
    departamento: textoObligatorio(f.departamento, 'El departamento'),
  });
}

/** Cuerpo del alta de un alumno: textos recortados y sin los opcionales vacíos. */
export function cuerpoAlumno(f: FormularioAlumno): NuevoAlumnoDTO {
  const cuerpo: NuevoAlumnoDTO = {
    codigo: f.codigo.trim(),
    nombre: f.nombre.trim(),
    correo: f.correo.trim(),
  };
  if (f.dni.trim()) cuerpo.dni = f.dni.trim();
  if (f.telefono.trim()) cuerpo.telefono = f.telefono.trim();
  if (f.direccion.trim()) cuerpo.direccion = f.direccion.trim();
  if (f.fechaNacimiento) cuerpo.fechaNacimiento = f.fechaNacimiento;
  return cuerpo;
}

export function cuerpoDocente(f: FormularioDocente): NuevoDocenteDTO {
  return {
    codigoDocente: f.codigoDocente.trim(),
    nombre: f.nombre.trim(),
    correoInstitucional: f.correoInstitucional.trim(),
    departamento: f.departamento.trim(),
  };
}
