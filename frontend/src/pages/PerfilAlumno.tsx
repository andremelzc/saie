import React, { useState } from 'react';
import CabeceraPantalla from '../components/estudiante/CabeceraPantalla';
import { EstadoError } from '../components/ui/EstadoError';
import { ID_CONTENIDO } from '../components/ui/EnlaceSaltar';
import { Icono } from '../components/estudiante/ElementosHorario';
import SeccionEditable from '../components/estudiante/SeccionEditable';
import type { CampoPerfil } from '../components/estudiante/SeccionEditable';
import { TIPOS_SANGRE } from '../types/perfil';
import type { CambiosPerfil, PerfilAlumnoDTO } from '../types/perfil';
import {
  cambiosDatosPersonales,
  cambiosFichaMedica,
  formatearFecha,
  iniciales,
  validarDatosPersonales,
  validarFichaMedica,
  valoresDatosPersonales,
  valoresFichaMedica,
} from '../utils/perfil';
import type { ValoresFormulario } from '../utils/perfil';

const TRAZO_USUARIO = 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
const TRAZO_CORAZON =
  'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
const TRAZO_CANDADO =
  'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z';

const CAMPOS_DATOS_PERSONALES: CampoPerfil[] = [
  {
    clave: 'dni',
    etiqueta: 'DNI',
    tipo: 'numero',
    ayuda: '8 dígitos.',
    placeholder: '12345678',
    autoComplete: 'off',
  },
  {
    clave: 'fechaNacimiento',
    etiqueta: 'Fecha de nacimiento',
    tipo: 'fecha',
    autoComplete: 'bday',
    formatoLectura: (valor) => formatearFecha(valor) ?? valor,
  },
  {
    clave: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'telefono',
    ayuda: 'Entre 7 y 15 dígitos, sin espacios ni guiones.',
    placeholder: '987654321',
    autoComplete: 'tel',
  },
  {
    clave: 'direccion',
    etiqueta: 'Dirección',
    tipo: 'texto',
    placeholder: 'Av. / Jr. / Calle y número, distrito',
    autoComplete: 'street-address',
  },
];

const CAMPOS_FICHA_MEDICA: CampoPerfil[] = [
  {
    clave: 'condicionAccesible',
    etiqueta: '¿Tienes alguna condición física que te impide subir a pisos superiores?',
    tipo: 'checkbox',
    ayuda:
      'Si la marcas, el sistema te prioriza las aulas del primer piso. Describe un requisito de acceso al espacio, no un diagnóstico.',
  },
  { clave: 'tipoSangre', etiqueta: 'Tipo de sangre', tipo: 'select', opciones: TIPOS_SANGRE },
  {
    clave: 'alergias',
    etiqueta: 'Alergias',
    tipo: 'area',
    ayuda: 'Medicamentos, alimentos u otras. Máximo 500 caracteres.',
  },
  {
    clave: 'condicionEspecial',
    etiqueta: 'Condición especial',
    tipo: 'area',
    ayuda: 'Algo que el personal deba saber en una emergencia. Máximo 500 caracteres.',
  },
  {
    clave: 'contactoEmergencia',
    etiqueta: 'Contacto de emergencia',
    tipo: 'texto',
    ayuda: 'Nombre, parentesco y teléfono. Máximo 200 caracteres.',
    placeholder: 'Nombre (parentesco) · teléfono',
  },
];

export interface PerfilAlumnoProps {
  /** Perfil del alumno (GET /v1/estudiante/perfil). Mientras sea null se muestra la carga. */
  perfil?: PerfilAlumnoDTO | null;
  cargando?: boolean;
  /** Mensaje de error de carga; muestra el botón «Reintentar» si hay `onReintentar`. */
  error?: string | null;
  onReintentar?: () => void;
  /** Guarda los cambios (PATCH /v1/estudiante/perfil) y devuelve el perfil actualizado. */
  onGuardar: (cambios: CambiosPerfil) => Promise<PerfilAlumnoDTO>;
}

const EsqueletoPerfil: React.FC = () => (
  <div role="status" aria-live="polite" className="flex flex-col gap-6">
    <span className="sr-only">Cargando tu perfil…</span>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        aria-hidden="true"
        className="h-40 animate-pulse rounded-2xl bg-saie-divider/60 motion-reduce:animate-none"
      />
    ))}
  </div>
);

/**
 * Pantalla «Mi perfil» del alumno (Issue 3.17): datos institucionales (solo lectura), datos
 * personales y ficha médica editables. La ficha médica es sensible (RNF-09, Ley 29733): la ruta
 * solo es accesible con la sesión del propio alumno.
 */
export const PerfilAlumno: React.FC<PerfilAlumnoProps> = ({
  perfil = null,
  cargando = false,
  error = null,
  onReintentar,
  onGuardar,
}) => {
  const [guardado, setGuardado] = useState<PerfilAlumnoDTO | null>(null);
  const actual = guardado ?? perfil;

  const guardar = async (cambios: CambiosPerfil): Promise<void> => {
    setGuardado(await onGuardar(cambios));
  };

  const renderCuerpo = (): React.ReactNode => {
    if (cargando) return <EsqueletoPerfil />;

    if (error) {
      return (
        <EstadoError
          mensaje={`No pudimos cargar tu perfil. ${error}`}
          onReintentar={onReintentar}
        />
      );
    }

    if (!actual) return <EsqueletoPerfil />;
    const { alumno, fichaMedica } = actual;

    return (
      <>
        <section
          aria-label="Datos institucionales"
          className="flex flex-col gap-5 rounded-2xl border border-saie-divider bg-white p-5 shadow-saie-card sm:flex-row sm:items-center sm:p-6"
        >
          <div
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saie-primary to-saie-primary-dark text-3xl font-bold text-white"
          >
            {iniciales(alumno.nombre)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-saie-primary/10 px-2.5 py-1 text-xs font-medium text-saie-primary">
              <Icono trazo={TRAZO_USUARIO} />
              Estudiante
            </p>
            <h2 className="m-0 mt-2 text-2xl font-bold leading-8">{alumno.nombre}</h2>
            <dl className="m-0 mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-saie-muted">
              <div className="flex gap-1.5">
                <dt>Código:</dt>
                <dd className="m-0 font-medium text-saie-text">{alumno.codigo}</dd>
              </div>
              <div className="flex min-w-0 gap-1.5">
                <dt>Correo:</dt>
                <dd className="m-0 min-w-0 break-all font-medium text-saie-text">
                  {alumno.correo}
                </dd>
              </div>
            </dl>
            <p className="m-0 mt-3 text-xs text-saie-muted">
              Tu nombre, código y correo institucional no se editan aquí: su actualización
              corresponde a la oficina académica.
            </p>
          </div>
        </section>

        <SeccionEditable
          id="datos-personales"
          titulo="Datos personales"
          descripcion="Puedes mantenerlos al día cuando cambien."
          trazoIcono={TRAZO_USUARIO}
          campos={CAMPOS_DATOS_PERSONALES}
          valores={valoresDatosPersonales(alumno)}
          validar={(valores: ValoresFormulario) => validarDatosPersonales(valores)}
          onGuardar={(valores) => guardar(cambiosDatosPersonales(valores))}
        />

        <SeccionEditable
          id="ficha-medica"
          titulo="Ficha médica"
          descripcion="Información que ayuda a atenderte en una emergencia."
          trazoIcono={TRAZO_CORAZON}
          campos={CAMPOS_FICHA_MEDICA}
          valores={valoresFichaMedica(fichaMedica)}
          validar={validarFichaMedica}
          onGuardar={(valores) => guardar(cambiosFichaMedica(valores))}
          textoVacio="Aún no registras tu ficha médica. Es opcional, pero ayuda a atenderte mejor en una emergencia."
          aviso={
            <p className="m-0 flex items-start gap-2 rounded-xl bg-saie-primary/5 p-3 text-sm text-saie-text">
              <Icono trazo={TRAZO_CANDADO} className="mt-0.5 h-4 w-4 shrink-0 text-saie-primary" />
              <span>
                <strong className="font-semibold">Información sensible.</strong> Solo tú la ves,
                dentro de tu sesión. No se comparte con otros alumnos.
              </span>
            </p>
          }
        />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <CabeceraPantalla
        titulo="Mi perfil"
        subtitulo="Tus datos personales y tu ficha médica."
        trazoIcono={TRAZO_USUARIO}
        ancho="max-w-saie-lectura"
      />

      <main
        id={ID_CONTENIDO}
        tabIndex={-1}
        className="focus:outline-none mx-auto flex w-full max-w-saie-lectura flex-col gap-6 px-4 py-6"
      >
        {renderCuerpo()}
      </main>
    </div>
  );
};

export default PerfilAlumno;
