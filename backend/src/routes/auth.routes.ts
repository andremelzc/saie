import { Router } from 'express';
import {
  cambiarClaveCuenta,
  loginAdmin,
  loginAlumno,
  loginDocente,
} from '../controllers/auth.controller';
import { authGuardCambioClave } from '../middlewares/auth.middleware';

const router = Router();

// Un único mecanismo (services/auth.service.ts) con una puerta de entrada por tipo de usuario.
router.post('/admin/login', loginAdmin); // Issue 4.8
router.post('/alumno/login', loginAlumno); // Issue 3.21
router.post('/docente/login', loginDocente); // Issue 7.1

// Cambio de la propia clave, para los 4 roles (Issue 4.21). Es la única ruta autenticada que una
// cuenta con `debeCambiarClave` puede usar (Issue 4.45).
router.post('/cambiar-clave', authGuardCambioClave, cambiarClaveCuenta);

export default router;
