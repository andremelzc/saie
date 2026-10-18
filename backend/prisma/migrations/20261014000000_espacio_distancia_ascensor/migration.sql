-- Distancia (en metros) hasta el ascensor del pabellón: base de la regla de accesibilidad.
-- Con ella el motor ordena los bloques de pisos superiores cuando no hay ninguno en Piso 1
-- (R-07 / RF-10) y la consulta puede indicar si el acceso es por ascensor (HU-04, criterio 3).
ALTER TABLE "espacios" ADD COLUMN "distancia_ascensor" INTEGER;
