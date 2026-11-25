-- Issue 3.61 (riesgos R15 y R16 de la auditoría).
-- R15: los docentes también declaran que no pueden subir a pisos superiores, con la misma
-- aprobación de Coordinación (Issue 3.60). La solicitud es de un alumno o de un docente.
-- R16: la condición puede ser temporal; una fecha de fin opcional la retira al vencer.
-- No borra ni cambia datos existentes: las solicitudes actuales siguen siendo de alumnos.

-- Solicitudes: de un alumno o de un docente, con fecha de fin opcional.
ALTER TABLE "solicitudes_accesibilidad" ALTER COLUMN "alumno_id" DROP NOT NULL;
ALTER TABLE "solicitudes_accesibilidad" ADD COLUMN "docente_id" TEXT;
ALTER TABLE "solicitudes_accesibilidad" ADD COLUMN "fecha_fin" DATE;

CREATE INDEX "solicitudes_accesibilidad_docente_id_idx" ON "solicitudes_accesibilidad"("docente_id");

ALTER TABLE "solicitudes_accesibilidad" ADD CONSTRAINT "solicitudes_accesibilidad_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactamente uno de los dos: alumno o docente.
ALTER TABLE "solicitudes_accesibilidad" ADD CONSTRAINT "solicitudes_accesibilidad_un_solicitante" CHECK (("alumno_id" IS NULL) <> ("docente_id" IS NULL));

-- Alumno: día en que vence su condición aprobada (null = no vence).
ALTER TABLE "fichas_medicas" ADD COLUMN "condicion_accesible_hasta" DATE;

-- Docente: su condición aprobada y su vencimiento.
ALTER TABLE "docentes" ADD COLUMN "condicion_accesible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "docentes" ADD COLUMN "condicion_accesible_hasta" DATE;
