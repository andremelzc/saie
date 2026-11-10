import React, { useState } from 'react';
import AltaCompletada from '../../components/admin/AltaCompletada';
import CampoFormulario from '../../components/admin/CampoFormulario';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { useAccion } from '../../hooks/useAccion';
import { crearAlumno } from '../../services/admin';
import type { UsuarioCreadoDTO } from '../../types/admin';
import {
  ALUMNO_VACIO,
  MAXIMO_CODIGO,
  MAXIMO_TEXTO,
  cuerpoAlumno,
  hoyIso,
  validarAlumno,
  type FormularioAlumno,
} from '../../utils/altaUsuarios';

/**
 * Alta individual de alumnos (Issue 4.17, solo Coordinación): para las altas tardías que no
 * vienen en la matrícula masiva. El servidor crea la cuenta con el código como usuario y clave
 * inicial, y con `debeCambiarClave = true`; rechaza con 409 un código que ya existe.
 */
export const AltaAlumnoPage: React.FC = () => {
  const accion = useAccion();
  const [form, setForm] = useState<FormularioAlumno>(ALUMNO_VACIO);
  const [intentado, setIntentado] = useState(false);
  const [creado, setCreado] = useState<UsuarioCreadoDTO | null>(null);

  const errores = validarAlumno(form);
  const error = (campo: keyof FormularioAlumno) => (intentado ? errores[campo] : undefined);
  const cambiar = (campo: keyof FormularioAlumno) => (valor: string) => {
    accion.limpiarError();
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIntentado(true);
    if (Object.keys(errores).length > 0) return;

    const resultado = await accion.ejecutar(() => crearAlumno(cuerpoAlumno(form)), {
      avisarError: false,
    });
    if (resultado?.ok) setCreado(resultado.valor);
  };

  const otro = () => {
    setForm(ALUMNO_VACIO);
    setIntentado(false);
    setCreado(null);
  };

  return (
    <LayoutAdmin titulo="Alta de alumnos" subtitulo="Coordinación Académica">
      <section
        aria-label="Alta individual de un alumno"
        className="flex max-w-3xl flex-col gap-5 rounded-2xl border border-saie-divider bg-white p-5"
      >
        {creado ? (
          <AltaCompletada usuario={creado} tipo="alumno" onOtro={otro} />
        ) : (
          <form
            onSubmit={(ev) => void enviar(ev)}
            noValidate
            className="flex flex-col gap-5"
            aria-busy={accion.cargando || undefined}
          >
            <p className="m-0 text-sm text-saie-muted">
              Registra a un alumno que no venga en la carga masiva de matrículas. Su cuenta se crea
              con el código como usuario y clave inicial, y deberá cambiarla en su primer ingreso.
            </p>

            {accion.error && <Aviso tono="error">{accion.error}</Aviso>}

            <div className="grid gap-4 sm:grid-cols-2">
              <CampoFormulario
                id="alumno-codigo"
                etiqueta="Código de alumno"
                valor={form.codigo}
                onCambio={cambiar('codigo')}
                obligatorio
                maxLength={MAXIMO_CODIGO}
                inputMode="numeric"
                error={error('codigo')}
              />
              <CampoFormulario
                id="alumno-nombre"
                etiqueta="Nombre completo"
                valor={form.nombre}
                onCambio={cambiar('nombre')}
                obligatorio
                maxLength={MAXIMO_TEXTO}
                autoComplete="off"
                error={error('nombre')}
              />
              <CampoFormulario
                id="alumno-correo"
                etiqueta="Correo"
                type="email"
                valor={form.correo}
                onCambio={cambiar('correo')}
                obligatorio
                maxLength={MAXIMO_TEXTO}
                error={error('correo')}
                className="sm:col-span-2"
              />
            </div>

            <fieldset className="flex flex-col gap-4 border-0 p-0">
              <legend className="mb-1 p-0 text-base font-bold text-saie-text">
                Datos personales
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoFormulario
                  id="alumno-dni"
                  etiqueta="DNI"
                  valor={form.dni}
                  onCambio={cambiar('dni')}
                  maxLength={MAXIMO_TEXTO}
                  inputMode="numeric"
                  error={error('dni')}
                />
                <CampoFormulario
                  id="alumno-telefono"
                  etiqueta="Teléfono"
                  type="tel"
                  valor={form.telefono}
                  onCambio={cambiar('telefono')}
                  maxLength={MAXIMO_TEXTO}
                  error={error('telefono')}
                />
                <CampoFormulario
                  id="alumno-direccion"
                  etiqueta="Dirección"
                  valor={form.direccion}
                  onCambio={cambiar('direccion')}
                  maxLength={MAXIMO_TEXTO}
                  error={error('direccion')}
                />
                <CampoFormulario
                  id="alumno-nacimiento"
                  etiqueta="Fecha de nacimiento"
                  type="date"
                  valor={form.fechaNacimiento}
                  onCambio={cambiar('fechaNacimiento')}
                  max={hoyIso()}
                  error={error('fechaNacimiento')}
                />
              </div>
            </fieldset>

            <div>
              <Boton
                type="submit"
                cargando={accion.cargando}
                textoCargando="Dando de alta…"
                anchoCompleto
              >
                Dar de alta al alumno
              </Boton>
            </div>
          </form>
        )}
      </section>
    </LayoutAdmin>
  );
};

export default AltaAlumnoPage;
