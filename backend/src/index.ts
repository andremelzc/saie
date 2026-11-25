import 'dotenv/config';
import { createApp } from './app.js';
import { registrarManejadores } from './events/registro.js';
import { logger } from './lib/logger.js';

const app = createApp();
registrarManejadores();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Servidor SAIE Backend ejecutándose en http://localhost:${PORT}`);
  logger.info(`Health check disponible en http://localhost:${PORT}/api/health`);
});
