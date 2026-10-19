import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import AppRoutes from './AppRoutes';
import { aplicarPreferencias, leerPreferencias } from './utils/preferencias';

export const App: React.FC = () => {
  // Aplica las preferencias guardadas (Issue 3.17) desde la primera pantalla.
  useEffect(() => {
    aplicarPreferencias(leerPreferencias());
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
