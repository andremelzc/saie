-- CreateTable (Issue 3.60): Coordinación confirma la declaración de accesibilidad del alumno.
-- Tabla nueva, no toca datos existentes. Reutiliza el enum "EstadoSolicitud".
CREATE TABLE "solicitudes_accesibilidad" (
    "id" TEXT NOT NULL,
    "alumno_id" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_por_id" TEXT,
    "fecha_resolucion" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "resultado" TEXT,

    CONSTRAINT "solicitudes_accesibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_accesibilidad_estado_idx" ON "solicitudes_accesibilidad"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_accesibilidad_alumno_id_idx" ON "solicitudes_accesibilidad"("alumno_id");

-- AddForeignKey
ALTER TABLE "solicitudes_accesibilidad" ADD CONSTRAINT "solicitudes_accesibilidad_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_accesibilidad" ADD CONSTRAINT "solicitudes_accesibilidad_resuelta_por_id_fkey" FOREIGN KEY ("resuelta_por_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security, como el resto de las tablas del modelo
ALTER TABLE "solicitudes_accesibilidad" ENABLE ROW LEVEL SECURITY;
