-- CreateEnum
CREATE TYPE "TipoArchivoImportacion" AS ENUM ('CURSOS_SECCIONES', 'HORARIOS', 'MATRICULAS', 'DOCENTES');

-- CreateEnum
CREATE TYPE "ResultadoImportacion" AS ENUM ('EXITOSA', 'CON_ERRORES');

-- CreateTable (Issue 4.54): tabla nueva, no toca datos existentes
CREATE TABLE "importaciones" (
    "id" TEXT NOT NULL,
    "tipo" "TipoArchivoImportacion" NOT NULL,
    "cuenta_id" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filas_recibidas" INTEGER NOT NULL,
    "filas_aceptadas" INTEGER NOT NULL,
    "filas_rechazadas" INTEGER NOT NULL,
    "resultado" "ResultadoImportacion" NOT NULL,

    CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "importaciones_tipo_fecha_idx" ON "importaciones"("tipo", "fecha");

-- Row Level Security, como el resto de las tablas del modelo
ALTER TABLE "importaciones" ENABLE ROW LEVEL SECURITY;
