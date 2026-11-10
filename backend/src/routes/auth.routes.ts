import { Router } from 'express';
import {
  cambiarClaveCuenta,
  loginAdmin,
  loginAlumno,
  loginDocente,
} from '../controllers/auth.controller';
import { authGuardCambioClave } from '../middlewares/auth.middleware';
import { crearLimitadoresLogin } from '../middlewares/limitador.middleware';

const router = Router();

// Límite de intentos fallidos por IP y por usuario en los tres logins (Issue 1.12).
const limitarLogin = crearLimitadoresLogin();

// Un único mecanismo (services/auth.service.ts) con una puerta de entrada por tipo de usuario.
router.post('/admin/login', limitarLogin, loginAdmin); // Issue 4.8
router.post('/alumno/login', limitarLogin, loginAlumno); // Issue 3.21
router.post('/docente/login', limitarLogin, loginDocente); // Issue 7.1

// Cambio de la propia clave, para los 4 roles (Issue 4.21). Es la única ruta autenticada que una
// cuenta con `debeCambiarClave` puede usar (Issue 4.45).
router.post('/cambiar-clave', authGuardCambioClave, cambiarClaveCuenta);

export default router;
