import { Router } from 'express';
import {
  consultarPorCodigoAlumno,
  consultarPorCodigoCurso,
} from '../controllers/consulta.controller';

const router = Router();

// GET /api/v1/consulta/alumno/:codigoAlumno (Issue 3.2)
router.get('/alumno/:codigoAlumno', consultarPorCodigoAlumno);

// GET /api/v1/consulta/curso/:codigoCurso (Issue 3.4)
router.get('/curso/:codigoCurso', consultarPorCodigoCurso);

export default router;
