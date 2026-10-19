-- Catálogo de software (Spec 08 / Issue 4.27).
-- Migración ADITIVA: crea el catálogo y sus dos relaciones, y NO toca las columnas antiguas
-- `espacios.software_instalado` ni `secciones.stack_software_requerido`. Su borrado queda para
-- la segunda migración del Issue 4.28, una vez que el backfill y el motor usen el catálogo.

-- CreateEnum
CREATE TYPE "CategoriaSoftware" AS ENUM ('SISTEMA_OPERATIVO', 'IDE', 'LENGUAJE', 'BASE_DATOS', 'REDES', 'SIMULACION', 'OFIMATICA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoLicencia" AS ENUM ('LIBRE', 'EDUCATIVA', 'COMERCIAL');

-- CreateEnum
CREATE TYPE "ComparacionVersion" AS ENUM ('CUALQUIERA', 'EXACTA', 'MINIMA');

-- CreateTable
CREATE TABLE "software" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '',
    "categoria" "CategoriaSoftware" NOT NULL,
    "tipo_licencia" "TipoLicencia" NOT NULL DEFAULT 'LIBRE',
    "descripcion" TEXT,
    "fabricante" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espacio_software" (
    "espacio_id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "fecha_instalacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrado_por_id" TEXT,

    CONSTRAINT "espacio_software_pkey" PRIMARY KEY ("espacio_id","software_id")
);

-- CreateTable
CREATE TABLE "seccion_software" (
    "seccion_id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "comparacion_version" "ComparacionVersion" NOT NULL DEFAULT 'CUALQUIERA',

    CONSTRAINT "seccion_software_pkey" PRIMARY KEY ("seccion_id","software_id")
);

-- CreateIndex
CREATE INDEX "software_categoria_idx" ON "software"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "software_nombre_normalizado_version_key" ON "software"("nombre_normalizado", "version");

-- CreateIndex
CREATE INDEX "espacio_software_software_id_idx" ON "espacio_software"("software_id");

-- CreateIndex
CREATE INDEX "seccion_software_software_id_idx" ON "seccion_software"("software_id");

-- AddForeignKey
ALTER TABLE "software" ADD CONSTRAINT "software_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacio_software" ADD CONSTRAINT "espacio_software_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacio_software" ADD CONSTRAINT "espacio_software_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacio_software" ADD CONSTRAINT "espacio_software_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seccion_software" ADD CONSTRAINT "seccion_software_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seccion_software" ADD CONSTRAINT "seccion_software_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software"("id") ON DELETE CASCADE ON UPDATE CASCADE;
