import React from 'react';
import { Link } from 'react-router-dom';
import CabeceraPantalla from '../components/estudiante/CabeceraPantalla';
import { Contenedor } from '../components/ui/Contenedor';
import { ID_CONTENIDO } from '../components/ui/EnlaceSaltar';
import { RUTAS } from '../config/rutas';
import { ICONOS } from '../components/ui/iconos';

const TRAZO_AYUDA = ICONOS.ayuda;

interface Pregunta {
  pregunta: string;
  respuesta: React.ReactNode;
}

interface GrupoPreguntas {
  id: string;
  titulo: string;
  preguntas: Pregunta[];
}

/** Contenido de ejemplo de la ayuda (Issue 3.17); la redacción final la define la Facultad. */
const GRUPOS: GrupoPreguntas[] = [
  {
    id: 'horario',
    titulo: 'Horario y aulas',
    preguntas: [
      {
        pregunta: '¿Dónde veo mis clases de hoy y de la semana?',
        respuesta: (
          <>
            En{' '}
            <Link to={RUTAS.horarioAlumno || '/estudiante/horario'}>Mi horario y mis cursos</Link>{' '}
            tienes tu semana día por día, con docente, aula y pabellón de cada curso matriculado.
          </>
        ),
      },
      {
        pregunta: '¿Qué significa «En revisión» o «Sin asignar»?',
        respuesta:
          'Tu curso todavía no tiene un aula o laboratorio confirmado. «Sin asignar» quiere decir que aún no se asigna; «en revisión» que Coordinación Académica lo está resolviendo a mano. Cuando se confirme, el estado cambia solo.',
      },
      {
        pregunta: '¿Por qué mi aula cambió?',
        respuesta:
          'Coordinación puede reasignar espacios, por ejemplo si un laboratorio queda deshabilitado. Tu horario siempre muestra el aula actual, así que conviene revisarlo antes de salir.',
      },
    ],
  },
  {
    id: 'datos',
    titulo: 'Mis datos y mi privacidad',
    preguntas: [
      {
        pregunta: '¿Cómo actualizo mi teléfono, mi dirección o mi ficha médica?',
        respuesta: (
          <>
            Entra a <Link to={RUTAS.perfilAlumno || '/estudiante/perfil'}>Mi perfil</Link>, pulsa
            «Editar» en la sección que quieras cambiar y guarda.
          </>
        ),
      },
      {
        pregunta: '¿Quién puede ver mi ficha médica?',
        respuesta:
          'Solo tú, dentro de tu sesión. Es información sensible y no se comparte con otros alumnos.',
      },
      {
        pregunta: '¿Cómo corrijo mi nombre, código o correo institucional?',
        respuesta:
          'Esos datos no se editan en la app: su actualización corresponde a la oficina académica de la Facultad.',
      },
    ],
  },
  {
    id: 'cuenta',
    titulo: 'Mi cuenta y la app',
    preguntas: [
      {
        pregunta: 'Mi sesión se cerró sola, ¿es normal?',
        respuesta:
          'Sí. Por seguridad la sesión vence después de unas horas y se cierra al cerrar la pestaña. Solo vuelve a iniciar sesión.',
      },
      {
        pregunta: '¿Puedo agrandar el texto o quitar las animaciones?',
        respuesta: (
          <>
            Sí, desde <Link to={RUTAS.configuracionAlumno}>Configuración</Link>. Los cambios se
            guardan en este dispositivo.
          </>
        ),
      },
      {
        pregunta: 'Olvidé mi clave o no puedo entrar',
        respuesta:
          'Las claves las administra la Facultad. Comunícate con la oficina académica para que te la restablezcan.',
      },
    ],
  },
];

/**
 * Pantalla «Ayuda» del alumno (Issue 3.17): preguntas frecuentes agrupadas por tema. Es de
 * solo lectura y no necesita datos del backend. Es alcanzable desde el inicio del alumno.
 */
export const AyudaAlumno: React.FC = () => (
  <div className="min-h-screen bg-saie-canvas pb-[var(--saie-barra-inferior)] text-saie-text">
    <CabeceraPantalla
      titulo="Ayuda"
      subtitulo="Respuestas a las dudas más comunes."
      trazoIcono={TRAZO_AYUDA}
      ancho="normal"
    />

    <Contenedor
      como="main"
      ancho="normal"
      id={ID_CONTENIDO}
      tabIndex={-1}
      className="flex flex-col gap-8 py-6 focus:outline-none"
    >
      {GRUPOS.map((grupo) => (
        <section
          key={grupo.id}
          aria-labelledby={`ayuda-${grupo.id}`}
          className="flex flex-col gap-3"
        >
          <h2 id={`ayuda-${grupo.id}`} className="m-0 font-serif text-xl font-bold">
            {grupo.titulo}
          </h2>
          <div className="flex flex-col gap-3">
            {grupo.preguntas.map((p) => (
              <details
                key={p.pregunta}
                className="group rounded-2xl border border-saie-divider bg-white shadow-sm"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 text-base font-medium marker:content-none focus-visible:outline-3 focus-visible:outline-saie-text [&::-webkit-details-marker]:hidden">
                  <span>{p.pregunta}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-saie-primary transition-transform group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm leading-6 text-saie-muted [&_a]:font-medium [&_a]:text-saie-primary">
                  {p.respuesta}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <p className="m-0 rounded-2xl border border-saie-divider bg-white p-5 text-sm text-saie-muted">
        ¿No encontraste lo que buscabas? Acércate a la oficina académica de la Facultad de
        Ingeniería.
      </p>
    </Contenedor>
  </div>
);

export default AyudaAlumno;
