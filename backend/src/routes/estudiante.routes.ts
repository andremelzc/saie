import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  actualizarPerfil,
  consultarMapaOcupacion,
  desvincularTelegram,
  listarCursos,
  obtenerHorario,
  obtenerPerfil,
  obtenerRuta,
  obtenerTelegram,
} from '../controllers/estudiante.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Solo el alumno autenticado (Issue 3.21); cada consulta usa el id de cuenta del token.
router.use(authGuard, roleGuard(RolCuenta.ALUMNO));

router.get('/horario', obtenerHorario); // Issue 3.10
router.get('/cursos', listarCursos); // Issue 3.11
router.get('/perfil', obtenerPerfil); // Issue 3.12
router.patch('/perfil', actualizarPerfil); // Issue 3.12
router.get('/mapa-ocupacion', consultarMapaOcupacion); // Issue 3.13
router.get('/ruta/:asignacionId', obtenerRuta); // Issue 3.14 / 3.15
router.get('/telegram', obtenerTelegram); // Issue 3.28
router.delete('/telegram', desvincularTelegram); // Issue 3.28

export default router;
