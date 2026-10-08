import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.routes.js';
import consultaRouter from './routes/consulta.routes.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import estudianteRouter from './routes/estudiante.routes.js';
import docenteRouter from './routes/docente.routes.js';
import asignacionRouter from './routes/asignacion.routes.js';

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
  app.use('/api/v1/consulta', consultaRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/estudiante', estudianteRouter);
  app.use('/api/v1/docente', docenteRouter);
  app.use('/api/v1/asignaciones', asignacionRouter);

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
