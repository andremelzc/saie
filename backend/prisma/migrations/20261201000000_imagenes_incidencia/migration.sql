-- CreateTable (Issue 7.19, riesgo R45): la foto que el docente adjunta como evidencia de una
-- incidencia (una por incidencia). Tabla nueva, no toca datos existentes.
CREATE TABLE "imagenes_incidencia" (
    "id" TEXT NOT NULL,
    "incidencia_id" TEXT NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "datos" BYTEA NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imagenes_incidencia_incidencia_id_key" ON "imagenes_incidencia"("incidencia_id");

-- AddForeignKey
ALTER TABLE "imagenes_incidencia" ADD CONSTRAINT "imagenes_incidencia_incidencia_id_fkey" FOREIGN KEY ("incidencia_id") REFERENCES "incidencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Solo imágenes, de hasta 2 MB (la API ya lo valida; esto lo garantiza en la base).
ALTER TABLE "imagenes_incidencia" ADD CONSTRAINT "imagenes_incidencia_tipo_mime_check" CHECK ("tipo_mime" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "imagenes_incidencia" ADD CONSTRAINT "imagenes_incidencia_tamano_check" CHECK ("tamano_bytes" > 0 AND "tamano_bytes" <= 2097152);

-- Row Level Security, como el resto de las tablas del modelo
ALTER TABLE "imagenes_incidencia" ENABLE ROW LEVEL SECURITY;
