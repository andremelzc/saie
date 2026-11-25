-- Issue 3.59 (riesgo R10 de la auditoría): alerta cuando una sección con alumnos con movilidad
-- reducida queda fuera del piso 1. Solo agrega un valor al enum; no toca datos existentes.
ALTER TYPE "TipoAlerta" ADD VALUE IF NOT EXISTS 'ACCESIBILIDAD';
