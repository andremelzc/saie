-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "solicitudes_software" (
    "id" TEXT NOT NULL,
    "docente_id" TEXT NOT NULL,
    "seccion_id" TEXT,
    "nombre" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '',
    "categoria" "CategoriaSoftware",
    "justificacion" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_por_id" TEXT,
    "fecha_resolucion" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "software_id" TEXT,

    CONSTRAINT "solicitudes_software_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_software_estado_idx" ON "solicitudes_software"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_software_docente_id_idx" ON "solicitudes_software"("docente_id");

-- AddForeignKey
ALTER TABLE "solicitudes_software" ADD CONSTRAINT "solicitudes_software_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_software" ADD CONSTRAINT "solicitudes_software_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_software" ADD CONSTRAINT "solicitudes_software_resuelta_por_id_fkey" FOREIGN KEY ("resuelta_por_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_software" ADD CONSTRAINT "solicitudes_software_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software"("id") ON DELETE SET NULL ON UPDATE CASCADE;
