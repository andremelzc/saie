-- AlterTable: un espacio deshabilitado queda fuera de la asignación del motor;
-- descripcion_uso es un rótulo opcional para mostrarlo en el mapa.
ALTER TABLE "espacios" ADD COLUMN "habilitado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "descripcion_uso" TEXT;
