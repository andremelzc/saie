import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NoEncontrada from './pages/NoEncontrada';
import LoginRoute from './components/auth/LoginRoute';
import RutaProtegida from './components/auth/RutaProtegida';
import { EsqueletoCarga } from './components/estudiante/ElementosHorario';
import { ProveedorAvisos } from './components/ui/Avisos';
import { ROLES_ADMIN, RUTAS } from './config/rutas';

/*
 * Carga diferida por pantalla (Issue 3.47): el navegador del alumno ya no descarga el código del
 * panel ni del docente. Home y la página «no encontrada» van en el paquete principal porque son
 * la entrada pública. Cada pantalla es su propio paquete y Vite agrupa lo que comparten.
 */
const Consulta = lazy(() => import('./pages/Consulta'));
const InicioEstudiante = lazy(() => import('./pages/InicioEstudiante'));
const HorarioMisCursosPage = lazy(() => import('./pages/HorarioMisCursosPage'));
const PerfilAlumnoPage = lazy(() => import('./pages/PerfilAlumnoPage'));
const MapaOcupacionPage = lazy(() => import('./pages/MapaOcupacionPage'));
const RutaAlumnoPage = lazy(() => import('./pages/RutaAlumnoPage'));
const TelegramAlumnoPage = lazy(() => import('./pages/TelegramAlumnoPage'));
const AyudaAlumno = lazy(() => import('./pages/AyudaAlumno'));
const ConfiguracionAlumno = lazy(() => import('./pages/ConfiguracionAlumno'));
const InicioDocentePage = lazy(() => import('./pages/docente/InicioDocentePage'));
const HorarioDocentePage = lazy(() => import('./pages/docente/HorarioDocentePage'));
const EspaciosDocentePage = lazy(() => import('./pages/docente/EspaciosDocentePage'));
const IncidenciasDocentePage = lazy(() => import('./pages/docente/IncidenciasDocentePage'));
const InicioAdmin = lazy(() => import('./pages/admin/InicioAdmin'));
const AlertasAdmin = lazy(() => import('./pages/admin/AlertasAdmin'));
const CargaDatos = lazy(() => import('./pages/admin/CargaDatos'));
const EspaciosAdmin = lazy(() => import('./pages/admin/EspaciosAdmin'));
const SeccionesAdmin = lazy(() => import('./pages/admin/SeccionesAdmin'));
const AuditoriaAdmin = lazy(() => import('./pages/admin/AuditoriaAdmin'));
const ReporteSalones = lazy(() => import('./pages/admin/ReporteSalones'));
const CambioLaboratorio = lazy(() => import('./pages/admin/CambioLaboratorio'));
const ProximamenteAdminPage = lazy(() => import('./pages/admin/ProximamenteAdminPage'));
const MapaAdminPage = lazy(() => import('./pages/admin/MapaAdminPage'));
const LaboratoriosAdminPage = lazy(() => import('./pages/admin/LaboratoriosAdminPage'));
const AltaAlumnoPage = lazy(() => import('./pages/admin/AltaAlumnoPage'));
const AltaDocentePage = lazy(() => import('./pages/admin/AltaDocentePage'));
const ClavesAdminPage = lazy(() => import('./pages/admin/ClavesAdminPage'));
const SoftwareAdminPage = lazy(() => import('./pages/admin/SoftwareAdminPage'));
const SolicitudesSoftwareAdminPage = lazy(
  () => import('./pages/admin/SolicitudesSoftwareAdminPage'),
);
const IncidenciasAdminPage = lazy(() => import('./pages/admin/IncidenciasAdminPage'));

/** Mientras llega el código de una pantalla se muestra el esqueleto de carga habitual. */
const CargandoPantalla: React.FC = () => (
  <div className="min-h-screen bg-saie-canvas px-4 py-6">
    <EsqueletoCarga texto="Cargando la pantalla…" />
  </div>
);

/** Rutas de la aplicación. Debe renderizarse dentro de <BrowserRouter> y <AuthProvider>. */
export const AppRoutes: React.FC = () => {
  return (
    <ProveedorAvisos>
      <Suspense fallback={<CargandoPantalla />}>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Consulta pública de espacios (Issue 3.7) */}
          <Route path={RUTAS.consulta} element={<Consulta />} />

          {/* Login de cada rol (Issues 3.22, 7.7 y 4.25) */}
          <Route path={RUTAS.loginAlumno} element={<LoginRoute rol="ALUMNO" />} />
          <Route path={RUTAS.loginDocente} element={<LoginRoute rol="DOCENTE" />} />
          <Route path={RUTAS.loginAdmin} element={<LoginRoute rol="ADMIN" />} />

          {/* Áreas privadas */}
          <Route
            path={RUTAS.inicioAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <InicioEstudiante />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.horarioAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <HorarioMisCursosPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.perfilAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <PerfilAlumnoPage />
              </RutaProtegida>
            }
          />
          {/* Pantallas en desarrollo (Issues 3.18 y 3.19): se anuncian sin romper la navegación. */}
          <Route
            path={RUTAS.mapaAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <MapaOcupacionPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.rutaAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <RutaAlumnoPage />
              </RutaProtegida>
            }
          />
          {/* Avisos por Telegram (Issue 3.28): el backend ya está listo, falta la pantalla. */}
          <Route
            path={RUTAS.telegramAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <TelegramAlumnoPage />
              </RutaProtegida>
            }
          />
          {/* Ayuda y preferencias de accesibilidad (Issue 3.17): existían pero no tenían ruta. */}
          <Route
            path={RUTAS.ayudaAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <AyudaAlumno />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.configuracionAlumno}
            element={
              <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
                <ConfiguracionAlumno />
              </RutaProtegida>
            }
          />
          {/* Portal del docente (Issues 7.8 a 7.12): inicio y pantallas pendientes. */}
          <Route
            path={RUTAS.inicioDocente}
            element={
              <RutaProtegida rolesPermitidos={['DOCENTE']} rutaLogin={RUTAS.loginDocente}>
                <InicioDocentePage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.horarioDocente}
            element={
              <RutaProtegida rolesPermitidos={['DOCENTE']} rutaLogin={RUTAS.loginDocente}>
                <HorarioDocentePage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.espaciosDocente}
            element={
              <RutaProtegida rolesPermitidos={['DOCENTE']} rutaLogin={RUTAS.loginDocente}>
                <EspaciosDocentePage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.incidenciasDocente}
            element={
              <RutaProtegida rolesPermitidos={['DOCENTE']} rutaLogin={RUTAS.loginDocente}>
                <IncidenciasDocentePage />
              </RutaProtegida>
            }
          />
          {/* Panel administrativo (Issues 4.9, 4.10, 4.19, 4.20 y 1.9) */}
          <Route
            path={RUTAS.inicioAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <InicioAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.alertasAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <AlertasAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.cargaAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['COORDINACION_ACADEMICA']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <CargaDatos />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.espaciosAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <EspaciosAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.cambioLaboratorio}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <CambioLaboratorio />
              </RutaProtegida>
            }
          />
          {/* Gestión individual de secciones (Issue 4.31). */}
          <Route
            path={RUTAS.seccionesAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <SeccionesAdmin />
              </RutaProtegida>
            }
          />
          {/* Auditoría e historial de asignaciones (Issue 4.32). */}
          <Route
            path={RUTAS.auditoriaAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <AuditoriaAdmin />
              </RutaProtegida>
            }
          />
          {/* Informe de salones imprimible (Issue 4.33). */}
          <Route
            path={RUTAS.reporteSalonesAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <ReporteSalones />
              </RutaProtegida>
            }
          />
          {/* Pantallas administrativas pendientes: se anuncian sin romper la navegación. */}
          <Route
            path={RUTAS.proximamenteAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <ProximamenteAdminPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.mapaAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['COORDINACION_ACADEMICA']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <MapaAdminPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.laboratoriosAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['COORDINACION_ACADEMICA']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <LaboratoriosAdminPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.altaAlumnoAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['COORDINACION_ACADEMICA']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <AltaAlumnoPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.altaDocenteAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['COORDINACION_ACADEMICA']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <AltaDocentePage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.clavesAdmin}
            element={
              <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
                <ClavesAdminPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.softwareAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['COORDINACION_ACADEMICA']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <SoftwareAdminPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.solicitudesSoftwareAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['COORDINACION_ACADEMICA']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <SolicitudesSoftwareAdminPage />
              </RutaProtegida>
            }
          />
          <Route
            path={RUTAS.incidenciasAdmin}
            element={
              <RutaProtegida
                rolesPermitidos={['JEFATURA_LABORATORIOS']}
                rutaLogin={RUTAS.loginAdmin}
              >
                <IncidenciasAdminPage />
              </RutaProtegida>
            }
          />

          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </Suspense>
    </ProveedorAvisos>
  );
};

export default AppRoutes;
