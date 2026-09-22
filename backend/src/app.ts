import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes.js';

export const createApp = (): Application => {
  const app = express();

  // Middlewares globales
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rutas base
  app.use('/api', healthRouter);

  // Manejo de rutas no encontradas (404)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'La ruta solicitada no existe',
    });
  });

  // Manejo global de errores (500)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error no controlado:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    });
  });

  return app;
};

export default createApp;
