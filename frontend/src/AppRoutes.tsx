import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Consulta from './pages/Consulta';
import AreaPrivadaPlaceholder from './pages/AreaPrivadaPlaceholder';
import CambiarClavePlaceholder from './pages/CambiarClavePlaceholder';
import LoginRoute from './components/auth/LoginRoute';
import RutaProtegida from './components/auth/RutaProtegida';
import { ROLES_ADMIN, RUTAS, TODOS_LOS_ROLES } from './config/rutas';

/** Rutas de la aplicación. Debe renderizarse dentro de <BrowserRouter> y <AuthProvider>. */
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Consulta pública de espacios por código de alumno o de curso (Issue 3.7) */}
      <Route path={RUTAS.consulta} element={<Consulta />} />

      {/* Login de cada rol (Issues 3.22, 7.7 y 4.25) */}
      <Route path={RUTAS.loginAlumno} element={<LoginRoute rol="ALUMNO" />} />
      <Route path={RUTAS.loginDocente} element={<LoginRoute rol="DOCENTE" />} />
      <Route path={RUTAS.loginAdmin} element={<LoginRoute rol="ADMIN" />} />

      {/* Áreas privadas: placeholders temporales hasta que existan los portales reales */}
      <Route
        path={RUTAS.inicioAlumno}
        element={
          <RutaProtegida rolesPermitidos={['ALUMNO']} rutaLogin={RUTAS.loginAlumno}>
            <AreaPrivadaPlaceholder titulo="Área del estudiante" />
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

      {/* Destino temporal de la redirección por clave inicial (pantalla real: Issue 4.21) */}
      <Route
        path={RUTAS.cambiarClave}
        element={
          <RutaProtegida rolesPermitidos={TODOS_LOS_ROLES}>
            <CambiarClavePlaceholder />
          </RutaProtegida>
        }
      />

      <Route path="*" element={<Home />} />
    </Routes>
  );
};

export default AppRoutes;
