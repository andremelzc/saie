import React from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from '../components/auth/BotonCerrarSesion';
import LogoEdificioGuinda from '../components/LogoEdificioGuinda';
import { useAuth } from '../context/useAuth';

export interface AreaPrivadaPlaceholderProps {
  titulo: string;
  enlaces?: { to: string; etiqueta: string }[];
}

export const AreaPrivadaPlaceholder: React.FC<AreaPrivadaPlaceholderProps> = ({
  titulo,
  enlaces = [],
}) => {
  const { sesion } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAF6ED] text-[#222222] flex flex-col justify-between">
      {/* 1. Header Oficial SAIE (Rojo Guinda #7B1113, Opaco y Fijo) */}
      <header className="sticky top-0 z-30 bg-[#7B1113] text-white shadow-md border-b border-[#5C0D0E] px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          {/* Logo e Identificador del Portal */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/" aria-label="Ir al inicio de SAIE" className="shrink-0">
              <LogoEdificioGuinda className="h-7 sm:h-8 text-white" />
            </Link>
            <span className="hidden sm:inline-block text-white/30 font-light">|</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white shrink-0">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 10 12 5 2 10l10 5 10-5Zm-16 3.2V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.8l-6 3-6-3Z" />
              </svg>
              Estudiante
            </span>
          </div>

          {/* Información de Sesión y Botón de Salida */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-[11px] text-white/70">Sesión activa</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wide">
                {sesion?.rol ?? 'ALUMNO'}
              </p>
            </div>
            <BotonCerrarSesion className="text-xs py-1.5 px-3 min-h-0 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors shrink-0" />
          </div>
        </div>
      </header>

      {/* 2. Contenido Principal / Dashboard Hub */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
        {/* Banner de Bienvenida */}
        <section className="bg-white border border-[#E6DFD0] rounded-2xl p-5 sm:p-8 shadow-sm flex flex-col items-start justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-[#7B1113]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#FAF6ED] border border-[#E6DFD0] text-xs font-semibold text-[#7B1113]">
              <span>Periodo Lectivo 2026-II</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-[#222222]">
              {titulo}
            </h1>
            <p className="text-xs sm:text-base text-[#666666] leading-relaxed">
              Bienvenido a tu portal académico. Consulta la programación de tus clases y la ubicación exacta de tus aulas y laboratorios en tiempo real.
            </p>
          </div>
        </section>

        {/* Módulos Principales del Estudiante */}
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-[#222222]">
            Servicios disponibles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Tarjeta Activa: Mi Horario y Mis Cursos */}
            {enlaces.map((enlace) => (
              <Link
                key={enlace.to}
                to={enlace.to}
                className="group bg-white border-2 border-[#7B1113] hover:border-[#5C0D0E] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#7B1113] text-white flex items-center justify-center shadow-xs">
                      <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7B1113] bg-[#7B1113]/10 px-2.5 py-1 rounded-full">
                      Acceso activo
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#222222] group-hover:text-[#7B1113] transition-colors">
                      {enlace.etiqueta}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#666666] mt-1">
                      Visualiza tu horario semanal (vista día y semana), tus asignaturas matriculadas, horarios y pabellones.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end font-medium text-xs sm:text-sm text-[#7B1113] group-hover:translate-x-1 transition-transform">
                  <span>Ir a mi horario</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </Link>
            ))}

            {/* Tarjeta Informativa: Próximos Módulos */}
            <div className="bg-white/80 border border-[#E6DFD0] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-5 opacity-85">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#666666]/10 text-[#666666] flex items-center justify-center">
                    <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-[#666666] bg-[#E6DFD0]/50 px-2.5 py-1 rounded-full">
                    Próximamente
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#222222]">Perfil y Telegram</h3>
                  <p className="text-xs sm:text-sm text-[#666666] mt-1">
                    Gestión de datos personales, ficha médica sensible y vinculación directa con el bot de notificaciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-[#E6DFD0] bg-white py-4 px-4 text-center text-xs text-[#666666]">
        Sistema de Asignación e Insumos Espaciales (SAIE) · Facultad de Ingeniería
      </footer>
    </div>
  );
};

export default AreaPrivadaPlaceholder;