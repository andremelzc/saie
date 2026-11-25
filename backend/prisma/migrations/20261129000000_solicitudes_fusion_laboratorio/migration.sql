-- CreateTable (Issue 7.17, riesgo R22): el docente pide «dictar todo en laboratorio» para su
-- sección de teoría y Coordinación la aprueba o rechaza. Tabla nueva, no toca datos existentes.
-- Reutiliza el enum "EstadoSolicitud".
CREATE TABLE "solicitudes_fusion_laboratorio" (
    "id" TEXT NOT NULL,
    "docente_id" TEXT NOT NULL,
    "seccion_teoria_id" TEXT NOT NULL,
    "seccion_laboratorio_id" TEXT NOT NULL,
    "justificacion" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_por_id" TEXT,
    "fecha_resolucion" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "resultado" TEXT,

    CONSTRAINT "solicitudes_fusion_laboratorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_fusion_laboratorio_estado_idx" ON "solicitudes_fusion_laboratorio"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_fusion_laboratorio_docente_id_idx" ON "solicitudes_fusion_laboratorio"("docente_id");

-- AddForeignKey
ALTER TABLE "solicitudes_fusion_laboratorio" ADD CONSTRAINT "solicitudes_fusion_laboratorio_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_fusion_laboratorio" ADD CONSTRAINT "solicitudes_fusion_laboratorio_seccion_teoria_id_fkey" FOREIGN KEY ("seccion_teoria_id") REFERENCES "secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_fusion_laboratorio" ADD CONSTRAINT "solicitudes_fusion_laboratorio_seccion_laboratorio_id_fkey" FOREIGN KEY ("seccion_laboratorio_id") REFERENCES "secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_fusion_laboratorio" ADD CONSTRAINT "solicitudes_fusion_laboratorio_resuelta_por_id_fkey" FOREIGN KEY ("resuelta_por_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security, como el resto de las tablas del modelo
ALTER TABLE "solicitudes_fusion_laboratorio" ENABLE ROW LEVEL SECURITY;
