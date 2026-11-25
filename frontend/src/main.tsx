import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { aplicarPreferencias, leerPreferencias } from './utils/preferencias';

// Las preferencias de accesibilidad (texto grande, reducir movimiento) se aplican al arrancar:
// antes solo se aplicaban al pulsar un interruptor y se perdían al recargar la página.
aplicarPreferencias(leerPreferencias());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
