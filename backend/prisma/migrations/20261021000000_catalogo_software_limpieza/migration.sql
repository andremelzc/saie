-- Catálogo de software — limpieza final (Spec 08 / Issue 4.28).
--
-- Cierra la migración aditiva de `20261020000000_catalogo_software`:
--   1. Copia al catálogo cualquier texto que siga en las columnas antiguas, por si el script
--      `npm run prisma:backfill-software` no se ejecutó antes de este despliegue. Así el
--      despliegue no pierde información aunque aplique las dos migraciones seguidas.
--   2. Elimina `espacios.software_instalado` y `secciones.stack_software_requerido`: a partir de
--      aquí el software solo vive en `software`, `espacio_software` y `seccion_software`.
--
-- La copia aplica la misma regla que `src/lib/software.ts` (`parsearNombreVersion`): la versión
-- es el último token que contiene al menos un dígito y solo usa `[A-Za-z0-9._+-]`; si no lo hay,
-- `version = ''`. El nombre se normaliza como el motor (`trim`, minúsculas, espacios colapsados).
--
-- Los textos dudosos (por ejemplo `R2023b` o nombres sin letras) se copian igual, como
-- `categoria = 'OTRO'`; el reporte de casos ambiguos lo genera el script de backfill, que debe
-- ejecutarse contra una copia de la base anterior a esta migración.
--
-- No se usan tablas temporales: cada sentencia repite la CTE de parseo para que la migración
-- funcione tanto si el motor la envuelve en una transacción como si no.

-- 1) Filas del catálogo: una por (nombre normalizado, versión). `min(...)` conserva una grafía
--    visible estable cuando el mismo software aparece escrito de varias formas.
WITH textos AS (
  SELECT e."id" AS espacio_id, NULL::text AS seccion_id, valor AS texto
  FROM "espacios" e, unnest(e."software_instalado") AS valor
  WHERE e."tipo" = 'LABORATORIO'
  UNION ALL
  SELECT NULL, s."id", valor
  FROM "secciones" s, unnest(s."stack_software_requerido") AS valor
  WHERE s."tipo_espacio_requerido" = 'LABORATORIO'
),
limpios AS (
  SELECT espacio_id, seccion_id, btrim(regexp_replace(texto, '\s+', ' ', 'g')) AS texto
  FROM textos
),
partes AS (
  SELECT espacio_id,
         seccion_id,
         texto,
         (regexp_match(texto, '^(.*\S)\s+([A-Za-z0-9._+-]*[0-9][A-Za-z0-9._+-]*)$'))[1] AS nombre,
         (regexp_match(texto, '^(.*\S)\s+([A-Za-z0-9._+-]*[0-9][A-Za-z0-9._+-]*)$'))[2] AS version
  FROM limpios
  WHERE texto <> ''
),
normalizado AS (
  SELECT lower(regexp_replace(btrim(COALESCE(nombre, texto)), '\s+', ' ', 'g')) AS nombre_normalizado,
         COALESCE(version, '') AS version,
         COALESCE(nombre, texto) AS nombre
  FROM partes
)
INSERT INTO "software" (
  "id",
  "nombre",
  "nombre_normalizado",
  "version",
  "categoria",
  "tipo_licencia",
  "fecha_creacion",
  "fecha_actualizacion"
)
SELECT gen_random_uuid()::text,
       min(nombre),
       nombre_normalizado,
       version,
       'OTRO',
       'LIBRE',
       now(),
       now()
FROM normalizado
GROUP BY nombre_normalizado, version
ON CONFLICT ("nombre_normalizado", "version") DO NOTHING;

-- 2) Relaciones. `EXACTA` conserva el comportamiento del texto libre (el nombre incluía la
--    versión); sin versión se acepta cualquier versión, como antes.
WITH textos AS (
  SELECT e."id" AS espacio_id, NULL::text AS seccion_id, valor AS texto
  FROM "espacios" e, unnest(e."software_instalado") AS valor
  WHERE e."tipo" = 'LABORATORIO'
  UNION ALL
  SELECT NULL, s."id", valor
  FROM "secciones" s, unnest(s."stack_software_requerido") AS valor
  WHERE s."tipo_espacio_requerido" = 'LABORATORIO'
),
limpios AS (
  SELECT espacio_id, seccion_id, btrim(regexp_replace(texto, '\s+', ' ', 'g')) AS texto
  FROM textos
),
partes AS (
  SELECT espacio_id,
         seccion_id,
         texto,
         (regexp_match(texto, '^(.*\S)\s+([A-Za-z0-9._+-]*[0-9][A-Za-z0-9._+-]*)$'))[1] AS nombre,
         (regexp_match(texto, '^(.*\S)\s+([A-Za-z0-9._+-]*[0-9][A-Za-z0-9._+-]*)$'))[2] AS version
  FROM limpios
  WHERE texto <> ''
)
INSERT INTO "espacio_software" ("espacio_id", "software_id")
SELECT DISTINCT l.espacio_id, sw."id"
FROM partes l
JOIN "software" sw
  ON sw."nombre_normalizado" = lower(regexp_replace(btrim(COALESCE(l.nombre, l.texto)), '\s+', ' ', 'g'))
 AND sw."version" = COALESCE(l.version, '')
WHERE l.espacio_id IS NOT NULL
ON CONFLICT DO NOTHING;

WITH textos AS (
  SELECT e."id" AS espacio_id, NULL::text AS seccion_id, valor AS texto
  FROM "espacios" e, unnest(e."software_instalado") AS valor
  WHERE e."tipo" = 'LABORATORIO'
  UNION ALL
  SELECT NULL, s."id", valor
  FROM "secciones" s, unnest(s."stack_software_requerido") AS valor
  WHERE s."tipo_espacio_requerido" = 'LABORATORIO'
),
limpios AS (
  SELECT espacio_id, seccion_id, btrim(regexp_replace(texto, '\s+', ' ', 'g')) AS texto
  FROM textos
),
partes AS (
  SELECT espacio_id,
         seccion_id,
         texto,
         (regexp_match(texto, '^(.*\S)\s+([A-Za-z0-9._+-]*[0-9][A-Za-z0-9._+-]*)$'))[1] AS nombre,
         (regexp_match(texto, '^(.*\S)\s+([A-Za-z0-9._+-]*[0-9][A-Za-z0-9._+-]*)$'))[2] AS version
  FROM limpios
  WHERE texto <> ''
)
INSERT INTO "seccion_software" ("seccion_id", "software_id", "comparacion_version")
SELECT DISTINCT l.seccion_id,
       sw."id",
       CASE
         WHEN COALESCE(l.version, '') = '' THEN 'CUALQUIERA'::"ComparacionVersion"
         ELSE 'EXACTA'::"ComparacionVersion"
       END
FROM partes l
JOIN "software" sw
  ON sw."nombre_normalizado" = lower(regexp_replace(btrim(COALESCE(l.nombre, l.texto)), '\s+', ' ', 'g'))
 AND sw."version" = COALESCE(l.version, '')
WHERE l.seccion_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) Eliminar las columnas antiguas: ya nada las usa.
ALTER TABLE "espacios" DROP COLUMN "software_instalado";
ALTER TABLE "secciones" DROP COLUMN "stack_software_requerido";
