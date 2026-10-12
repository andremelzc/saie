// Arranque de la demostración del mapa 3D: `npm run dev` y abrir /demo-mapa3d.html.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../index.css';
import Demo from './Demo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
