import { Router } from 'express';
import { enviarResumenDiario, recibirActualizacion } from '../controllers/telegram.controller';
import { tokenServicioGuard } from '../middlewares/servicio.middleware';

const router = Router();

// El webhook no usa JWT: lo autentica el secreto que Telegram envía en el encabezado.
router.post('/webhook', recibirActualizacion); // Issue 3.25

// Lo invoca la tarea programada con un token de servicio propio, no con un JWT de usuario.
router.post('/resumen-diario', tokenServicioGuard('RESUMEN_DIARIO_TOKEN'), enviarResumenDiario); // Issue 3.27

export default router;
