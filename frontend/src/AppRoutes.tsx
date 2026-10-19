import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Consulta from './pages/Consulta';
import AreaPrivadaPlaceholder from './pages/AreaPrivadaPlaceholder';
import InicioEstudiante from './pages/InicioEstudiante';
import HorarioMisCursosPage from './pages/HorarioMisCursosPage';
import PerfilAlumnoPage from './pages/PerfilAlumnoPage';
import ConfiguracionAlumno from './pages/ConfiguracionAlumno';
import AyudaAlumno from './pages/AyudaAlumno';
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
      <Route
        path={RUTAS.configuracionAlumno}
        element={
          <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
            <ConfiguracionAlumno />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.ayudaAlumno}
        element={
          <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
            <AyudaAlumno />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.inicioDocente}
        element={
          <RutaProtegida rolesPermitidos={['DOCENTE']} rutaLogin={RUTAS.loginDocente}>
            <AreaPrivadaPlaceholder titulo="Área del docente" />
          </RutaProtegida>
        }
      />
      <Route
        path={RUTAS.inicioAdmin}
        element={
          <RutaProtegida rolesPermitidos={ROLES_ADMIN} rutaLogin={RUTAS.loginAdmin}>
            <AreaPrivadaPlaceholder titulo="Área administrativa" />
          </RutaProtegida>
        }
      />

      <Route path="*" element={<Home />} />
    </Routes>
  );
};

export default AppRoutes;
