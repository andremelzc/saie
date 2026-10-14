import { TIPOS_SANGRE } from '../types/perfil';
import type {
  CambiosPerfil,
  DatosAlumnoDTO,
  FichaMedicaDTO,
  PerfilAlumnoDTO,
} from '../types/perfil';

/** Valores de un formulario: siempre texto; el vacío equivale a «sin dato» (null en el backend). */
export type ValoresFormulario = Record<string, string>;
export type ErroresFormulario = Record<string, string>;

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** «2003-04-12» → «12 de abril de 2003». Devuelve null si no hay fecha o no es válida. */
export function formatearFecha(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!coincidencia) return null;
  const [, anio, mes, dia] = coincidencia;
  const nombreMes = MESES[Number(mes) - 1];
  if (!nombreMes) return null;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}

/** Iniciales para el avatar: primera letra de las dos primeras palabras del nombre. */
export function iniciales(nombre: string): string {
  const letras = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase() ?? '');
  return letras.join('') || '?';
}

const aTexto = (valor: string | null | undefined): string => valor ?? '';

/** Texto de un campo → valor para el backend (recortado; vacío → null). */
export const aValorOpcional = (valor: string | undefined): string | null => {
  const limpio = (valor ?? '').trim();
  return limpio === '' ? null : limpio;
};

export function valoresDatosPersonales(alumno: DatosAlumnoDTO): ValoresFormulario {
  return {
    dni: aTexto(alumno.dni),
    fechaNacimiento: aTexto(alumno.fechaNacimiento),
    telefono: aTexto(alumno.telefono),
    direccion: aTexto(alumno.direccion),
  };
}

export function valoresFichaMedica(ficha: FichaMedicaDTO | null): ValoresFormulario {
  return {
    tipoSangre: aTexto(ficha?.tipoSangre),
    alergias: aTexto(ficha?.alergias),
    condicionEspecial: aTexto(ficha?.condicionEspecial),
    contactoEmergencia: aTexto(ficha?.contactoEmergencia),
  };
}

/** Misma regla que el backend: AAAA-MM-DD real, desde 1900 y no posterior a hoy. */
export function esFechaNacimientoValida(valor: string, hoy: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().startsWith(valor) &&
    fecha.getUTCFullYear() >= 1900 &&
    fecha.getTime() <= hoy.getTime()
  );
}

const LIMITES_TEXTO = {
  direccion: 200,
  alergias: 500,
  condicionEspecial: 500,
  contactoEmergencia: 200,
} as const;

function validarLongitud(valor: string, maximo: number, errores: ErroresFormulario, clave: string) {
  if (valor.trim().length > maximo) {
    errores[clave] = `Usa como máximo ${maximo} caracteres.`;
  }
}

/** Valida los datos personales con las mismas reglas que el backend (todos son opcionales). */
export function validarDatosPersonales(
  valores: ValoresFormulario,
  hoy: Date = new Date(),
): ErroresFormulario {
  const errores: ErroresFormulario = {};
  const dni = (valores.dni ?? '').trim();
  const fecha = (valores.fechaNacimiento ?? '').trim();
  const telefono = (valores.telefono ?? '').trim();

  if (dni && !/^\d{8}$/.test(dni)) errores.dni = 'El DNI debe tener 8 dígitos.';
  if (fecha && !esFechaNacimientoValida(fecha, hoy)) {
    errores.fechaNacimiento = 'Ingresa una fecha de nacimiento válida.';
  }
  if (telefono && !/^\+?\d{7,15}$/.test(telefono)) {
    errores.telefono = 'El teléfono debe tener entre 7 y 15 dígitos, sin espacios ni guiones.';
  }
  validarLongitud(valores.direccion ?? '', LIMITES_TEXTO.direccion, errores, 'direccion');
  return errores;
}

/** Valida la ficha médica con las mismas reglas que el backend (todos los campos son opcionales). */
export function validarFichaMedica(valores: ValoresFormulario): ErroresFormulario {
  const errores: ErroresFormulario = {};
  const tipo = (valores.tipoSangre ?? '').trim();

  if (tipo && !(TIPOS_SANGRE as readonly string[]).includes(tipo)) {
    errores.tipoSangre = 'Elige un tipo de sangre de la lista.';
  }
  validarLongitud(valores.alergias ?? '', LIMITES_TEXTO.alergias, errores, 'alergias');
  validarLongitud(
    valores.condicionEspecial ?? '',
    LIMITES_TEXTO.condicionEspecial,
    errores,
    'condicionEspecial',
  );
  validarLongitud(
    valores.contactoEmergencia ?? '',
    LIMITES_TEXTO.contactoEmergencia,
    errores,
    'contactoEmergencia',
  );
  return errores;
}

export function cambiosDatosPersonales(valores: ValoresFormulario): CambiosPerfil {
  return {
    datosPersonales: {
      dni: aValorOpcional(valores.dni),
      fechaNacimiento: aValorOpcional(valores.fechaNacimiento),
      telefono: aValorOpcional(valores.telefono),
      direccion: aValorOpcional(valores.direccion),
    },
  };
}

export function cambiosFichaMedica(valores: ValoresFormulario): CambiosPerfil {
  return {
    fichaMedica: {
      tipoSangre: aValorOpcional(valores.tipoSangre),
      alergias: aValorOpcional(valores.alergias),
      condicionEspecial: aValorOpcional(valores.condicionEspecial),
      contactoEmergencia: aValorOpcional(valores.contactoEmergencia),
    },
  };
}

/** Aplica los cambios a un perfil (lo que haría el backend); se usa con los datos de ejemplo. */
export function aplicarCambios(perfil: PerfilAlumnoDTO, cambios: CambiosPerfil): PerfilAlumnoDTO {
  return {
    alumno: { ...perfil.alumno, ...cambios.datosPersonales },
    fichaMedica: cambios.fichaMedica ? { ...cambios.fichaMedica } : perfil.fichaMedica,
  };
}
