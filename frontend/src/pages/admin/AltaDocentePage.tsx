import React, { useState } from 'react';
import AltaCompletada from '../../components/admin/AltaCompletada';
import CampoFormulario from '../../components/admin/CampoFormulario';
import { RUTAS } from '../../config/rutas';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { useAccion } from '../../hooks/useAccion';
import { crearDocente } from '../../services/admin';
import type { UsuarioCreadoDTO } from '../../types/admin';
import {
  DOCENTE_VACIO,
  MAXIMO_CODIGO,
  MAXIMO_TEXTO,
  cuerpoDocente,
  validarDocente,
  type FormularioDocente,
} from '../../utils/altaUsuarios';

/**
 * Alta individual de docentes (Issue 4.18, solo Coordinación). El servidor crea la cuenta con el
 * código como usuario y clave inicial, y con `debeCambiarClave = true`; rechaza con 409 un código
 * que ya existe.
 */
export const AltaDocentePage: React.FC = () => {
  const accion = useAccion();
  const [form, setForm] = useState<FormularioDocente>(DOCENTE_VACIO);
  const [intentado, setIntentado] = useState(false);
  const [creado, setCreado] = useState<UsuarioCreadoDTO | null>(null);

  const errores = validarDocente(form);
  const error = (campo: keyof FormularioDocente) => (intentado ? errores[campo] : undefined);
  const cambiar = (campo: keyof FormularioDocente) => (valor: string) => {
    accion.limpiarError();
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIntentado(true);
    if (Object.keys(errores).length > 0) return;

    const resultado = await accion.ejecutar(() => crearDocente(cuerpoDocente(form)), {
      avisarError: false,
    });
    if (resultado?.ok) setCreado(resultado.valor);
  };

  const otro = () => {
    setForm(DOCENTE_VACIO);
    setIntentado(false);
    setCreado(null);
  };

  return (
    <LayoutAdmin
      volverA={{ to: RUTAS.inicioAdmin, etiqueta: 'Volver al inicio' }}
      titulo="Alta de docentes"
      subtitulo="Coordinación Académica"
    >
      <section
        aria-label="Alta individual de un docente"
        className="flex max-w-3xl flex-col gap-5 rounded-2xl border border-saie-divider bg-white p-5"
      >
        {creado ? (
          <AltaCompletada usuario={creado} tipo="docente" onOtro={otro} />
        ) : (
          <form
            onSubmit={(ev) => void enviar(ev)}
            noValidate
            className="flex flex-col gap-5"
            aria-busy={accion.cargando || undefined}
          >
            <p className="m-0 text-sm text-saie-muted">
              Registra a un docente que no venga en la carga masiva. Su cuenta se crea con el código
              como usuario y clave inicial, y deberá cambiarla en su primer ingreso.
            </p>

            {accion.error && <Aviso tono="error">{accion.error}</Aviso>}

            <div className="grid gap-4 sm:grid-cols-2">
              <CampoFormulario
                id="docente-codigo"
                etiqueta="Código de docente"
                valor={form.codigoDocente}
                onCambio={cambiar('codigoDocente')}
                obligatorio
                maxLength={MAXIMO_CODIGO}
                error={error('codigoDocente')}
              />
              <CampoFormulario
                id="docente-nombre"
                etiqueta="Nombre completo"
                valor={form.nombre}
                onCambio={cambiar('nombre')}
                obligatorio
                maxLength={MAXIMO_TEXTO}
                error={error('nombre')}
              />
              <CampoFormulario
                id="docente-correo"
                etiqueta="Correo institucional"
                type="email"
                valor={form.correoInstitucional}
                onCambio={cambiar('correoInstitucional')}
                obligatorio
                maxLength={MAXIMO_TEXTO}
                error={error('correoInstitucional')}
              />
              <CampoFormulario
                id="docente-departamento"
                etiqueta="Departamento académico"
                valor={form.departamento}
                onCambio={cambiar('departamento')}
                obligatorio
                maxLength={MAXIMO_TEXTO}
                error={error('departamento')}
              />
            </div>

            <div>
              <Boton
                type="submit"
                cargando={accion.cargando}
                textoCargando="Dando de alta…"
                anchoCompleto
              >
                Dar de alta al docente
              </Boton>
            </div>
          </form>
        )}
      </section>
    </LayoutAdmin>
  );
};

export default AltaDocentePage;
