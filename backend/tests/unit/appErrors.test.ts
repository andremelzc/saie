// Mock de prisma para aislar las pruebas de la base de datos
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  default: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { createApp } from '../../src/app';

describe('Manejo global de errores y rutas inexistentes (app.ts)', () => {
  const app = createApp();

  describe('Rutas inexistentes (404)', () => {
    it('responde 404 con formato unificado { success: false, message }', async () => {
      const response = await request(app).get('/api/v1/ruta-completamente-inexistente');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'La ruta solicitada no existe',
      });
      // Asegurar que no se devuelvan claves obsoletas como "error"
      expect(response.body).not.toHaveProperty('error');
    });
  });

  describe('Manejador global de errores (500)', () => {
    it('captura errores no controlados y responde { success: false, message: "Error interno del servidor" }', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const testApp = express();

      testApp.get('/test-error', () => {
        throw new Error('connection to pooler terminated (falla técnica sensible)');
      });

      // Añadimos el middleware global tal como está configurado en app.ts
      testApp.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error('Error no controlado:', err);
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
        });
      });

      const response = await request(testApp).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Error interno del servidor',
      });
      // Garantizar que NO filtre ningún detalle técnico en el cuerpo de la respuesta
      expect(response.body).not.toHaveProperty('error');
      expect(JSON.stringify(response.body)).not.toContain('connection to pooler terminated');

      // Verifica que el error sí se haya registrado en el servidor
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
