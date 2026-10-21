import 'dotenv/config';
import { createApp } from './app.js';
import { registrarManejadores } from './events/registro.js';

const app = createApp();
registrarManejadores();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor SAIE Backend ejecutándose en http://localhost:${PORT}`);
  console.log(`🩺 Health check disponible en http://localhost:${PORT}/api/health`);
});
