import { Router } from 'express';
import { loginAdmin, loginAlumno, loginDocente } from '../controllers/auth.controller';

const router = Router();

// Un único mecanismo (services/auth.service.ts) con una puerta de entrada por tipo de usuario.
router.post('/admin/login', loginAdmin); // Issue 4.8
router.post('/alumno/login', loginAlumno); // Issue 3.21
router.post('/docente/login', loginDocente); // Issue 7.1

export default router;
