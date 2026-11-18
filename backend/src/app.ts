import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.routes.js';
import consultaRouter from './routes/consulta.routes.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import estudianteRouter from './routes/estudiante.routes.js';
import docenteRouter from './routes/docente.routes.js';
import asignacionRouter from './routes/asignacion.routes.js';
import importRouter from './routes/import.routes.js';
import telegramRouter from './routes/telegram.routes.js';
import { logger } from './lib/logger.js';
import { requestId } from './middlewares/requestId.middleware.js';

export const createApp = (): Application => {
  const app = express();

  // Detrás del proxy de Render la IP real llega en X-Forwarded-For; sin esto el límite de
  // intentos vería a todos los clientes como una sola IP (Issue 1.12).
  const proxies = Number(
    process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? 1 : 0),
  );
  if (proxies > 0) app.set('trust proxy', proxies);

  // Middlewares globales
  // Primero: así todo lo que sigue (incluidos los errores) lleva el X-Request-Id (Issue 1.15).
  app.use(requestId);
  // Cabeceras de seguridad. Es una API JSON consumida desde otro origen (Vercel → Render), por eso
  // la política de recursos es cross-origin; CORS sigue decidiendo quién puede leer las respuestas.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      // El frontend puede leer el id para citarlo al reportar un error.
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  // La importación lee su propio cuerpo (CSV o JSON de hasta 10 mb), con autenticación previa:
  // va antes de los parsers globales, que limitan el cuerpo a 100 kb.
  app.use('/api/v1/import', importRouter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rutas base
  app.use('/api', healthRouter);
  app.use('/api/v1/consulta', consultaRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/estudiante', estudianteRouter);
  app.use('/api/v1/docente', docenteRouter);
  app.use('/api/v1/asignaciones', asignacionRouter);
  app.use('/api/v1/telegram', telegramRouter);

  // Manejo de rutas no encontradas (404)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'La ruta solicitada no existe',
    });
  });

  // Manejo global de errores (500)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const id = res.locals.requestId as string | undefined;
    logger.error({ requestId: id, err }, 'Error no controlado');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      ...(id ? { requestId: id } : {}),
    });
  });

  return app;
};

export default createApp;
