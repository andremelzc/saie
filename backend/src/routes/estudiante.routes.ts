import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  actualizarPerfil,
  listarCursos,
  obtenerHorario,
  obtenerPerfil,
} from '../controllers/estudiante.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Solo el alumno autenticado (Issue 3.21); cada consulta usa el id de cuenta del token.
router.use(authGuard, roleGuard(RolCuenta.ALUMNO));

router.get('/horario', obtenerHorario); // Issue 3.10
router.get('/cursos', listarCursos); // Issue 3.11
router.get('/perfil', obtenerPerfil); // Issue 3.12
router.patch('/perfil', actualizarPerfil); // Issue 3.12

export default router;
