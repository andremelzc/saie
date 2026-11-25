-- Issue 1.17 (riesgo R35): una sección que deja de figurar en el CSV de cursos y secciones de su
-- curso se marca inactiva en lugar de borrarse. Las existentes quedan activas.
ALTER TABLE "secciones" ADD COLUMN "activa" BOOLEAN NOT NULL DEFAULT true;
