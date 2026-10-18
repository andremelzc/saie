-- Issue 2.17: el verificador posterior a la corrida deja constancia de su resultado en la
-- auditoría con un asiento propio (tipo de evento VERIFICACION).
ALTER TYPE "TipoEventoAuditoria" ADD VALUE 'VERIFICACION';
