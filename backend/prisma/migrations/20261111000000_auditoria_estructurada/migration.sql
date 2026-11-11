-- AlterTable: campos estructurados de la auditoría (Issue 4.48). Solo se agregan columnas nulas o
-- con valor por defecto: los registros existentes se conservan intactos y siguen mostrando su
-- "detalle".
ALTER TABLE "registros_auditoria"
    ADD COLUMN "corrida_id" TEXT,
    ADD COLUMN "espacios_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "cuenta_id" TEXT,
    ADD COLUMN "puntaje" DOUBLE PRECISION,
    ADD COLUMN "origen" TEXT;

-- CreateIndex
CREATE INDEX "registros_auditoria_corrida_id_idx" ON "registros_auditoria"("corrida_id");
