import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Consulta from './pages/Consulta';
import InicioEstudiante from './pages/InicioEstudiante';
import HorarioMisCursosPage from './pages/HorarioMisCursosPage';
import PerfilAlumnoPage from './pages/PerfilAlumnoPage';
import MapaOcupacionPage from './pages/MapaOcupacionPage';
import RutaAlumnoPage from './pages/RutaAlumnoPage';
import TelegramAlumnoPage from './pages/TelegramAlumnoPage';
import InicioDocentePage from './pages/docente/InicioDocentePage';
import HorarioDocentePage from './pages/docente/HorarioDocentePage';
import EspaciosDocentePage from './pages/docente/EspaciosDocentePage';
import IncidenciasDocentePage from './pages/docente/IncidenciasDocentePage';
import InicioAdmin from './pages/admin/InicioAdmin';
import AlertasAdmin from './pages/admin/AlertasAdmin';
import CargaDatos from './pages/admin/CargaDatos';
import EspaciosAdmin from './pages/admin/EspaciosAdmin';
import CambioLaboratorio from './pages/admin/CambioLaboratorio';
import ProximamenteAdminPage from './pages/admin/ProximamenteAdminPage';
import MapaAdminPage from './pages/admin/MapaAdminPage';
import LaboratoriosAdminPage from './pages/admin/LaboratoriosAdminPage';
import AltaAlumnoPage from './pages/admin/AltaAlumnoPage';
import AltaDocentePage from './pages/admin/AltaDocentePage';
import ClavesAdminPage from './pages/admin/ClavesAdminPage';
import SoftwareAdminPage from './pages/admin/SoftwareAdminPage';
import SolicitudesSoftwareAdminPage from './pages/admin/SolicitudesSoftwareAdminPage';
import IncidenciasAdminPage from './pages/admin/IncidenciasAdminPage';
import LoginRoute from './components/auth/LoginRoute';
import RutaProtegida from './components/auth/RutaProtegida';
import { ROLES_ADMIN, RUTAS } from './config/rutas';

/** Rutas de la aplicación. Debe renderizarse dentro de <BrowserRouter> y <AuthProvider>. */
export const AppRoutes: React.FC = () => {
  return (
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
          <RutaProtegida rolesPermitidos={['COORDINACION_ACADEMICA']} rutaLogin={RUTAS.loginAdmin}>
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
          <RutaProtegida rolesPermitidos={['COORDINACION_ACADEMICA']} rutaLogin={RUTAS.loginAdmin}>
            <MapaAdminPage />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.laboratoriosAdmin}
        element={
          <RutaProtegida rolesPermitidos={['COORDINACION_ACADEMICA']} rutaLogin={RUTAS.loginAdmin}>
            <LaboratoriosAdminPage />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.altaAlumnoAdmin}
        element={
          <RutaProtegida rolesPermitidos={['COORDINACION_ACADEMICA']} rutaLogin={RUTAS.loginAdmin}>
            <AltaAlumnoPage />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.altaDocenteAdmin}
        element={
          <RutaProtegida rolesPermitidos={['COORDINACION_ACADEMICA']} rutaLogin={RUTAS.loginAdmin}>
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
          <RutaProtegida rolesPermitidos={['COORDINACION_ACADEMICA']} rutaLogin={RUTAS.loginAdmin}>
            <SoftwareAdminPage />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.solicitudesSoftwareAdmin}
        element={
          <RutaProtegida rolesPermitidos={['COORDINACION_ACADEMICA']} rutaLogin={RUTAS.loginAdmin}>
            <SolicitudesSoftwareAdminPage />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.incidenciasAdmin}
        element={
          <RutaProtegida rolesPermitidos={['JEFATURA_LABORATORIOS']} rutaLogin={RUTAS.loginAdmin}>
            <IncidenciasAdminPage />
          </RutaProtegida>
        }
      />

      <Route path="*" element={<Home />} />
    </Routes>
  );
};

export default AppRoutes;
