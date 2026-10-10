import { Router } from 'express';
import { recibirActualizacion } from '../controllers/telegram.controller';

const router = Router();

// El webhook no usa JWT: lo autentica el secreto que Telegram envía en el encabezado.
router.post('/webhook', recibirActualizacion); // Issue 3.25

export default router;
