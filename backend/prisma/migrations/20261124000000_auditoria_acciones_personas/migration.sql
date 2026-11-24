-- AlterEnum: tipos de evento para las acciones de personas (Issue 4.58)
ALTER TYPE "TipoEventoAuditoria" ADD VALUE 'EDICION_ESPACIO';
ALTER TYPE "TipoEventoAuditoria" ADD VALUE 'EDICION_SECCION';
ALTER TYPE "TipoEventoAuditoria" ADD VALUE 'CAMBIO_LABORATORIO';

-- AlterTable: sección editada y lista de cambios (campo, valor anterior y nuevo). Columnas nulas:
-- los registros existentes se conservan intactos.
ALTER TABLE "registros_auditoria"
    ADD COLUMN "seccion_id" TEXT,
    ADD COLUMN "cambios" JSONB;
