-- Issue 4.64 (riesgos R25, R49-R52 de la auditoría): gestión de periodos desde Coordinación.
-- Solo agrega un enum, un valor de enum y una tabla; no modifica datos existentes.

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('EN_PREPARACION', 'VIGENTE', 'CERRADO');

-- AlterEnum: asiento de auditoría para el registro, activación y cierre de periodos
ALTER TYPE "TipoEventoAuditoria" ADD VALUE IF NOT EXISTS 'CAMBIO_PERIODO';

-- CreateTable
CREATE TABLE "periodos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'EN_PREPARACION',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "periodos_codigo_key" ON "periodos"("codigo");

-- Transición: los periodos que ya tienen secciones se registran. El más reciente queda vigente
-- (hoy solo existe 2026-2) y los demás cerrados. Las fechas se completan desde la pantalla.
INSERT INTO "periodos" ("id", "codigo", "estado")
SELECT gen_random_uuid()::text,
       s."periodo",
       CASE WHEN s."periodo" = (SELECT MAX("periodo") FROM "secciones" WHERE "periodo" ~ '^[0-9]{4}-[012]$')
            THEN 'VIGENTE'::"EstadoPeriodo"
            ELSE 'CERRADO'::"EstadoPeriodo" END
FROM (SELECT DISTINCT "periodo" FROM "secciones" WHERE "periodo" ~ '^[0-9]{4}-[012]$') s;

-- Row Level Security, como el resto de las tablas del modelo
ALTER TABLE "periodos" ENABLE ROW LEVEL SECURITY;
