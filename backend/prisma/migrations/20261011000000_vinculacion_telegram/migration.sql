-- CreateTable
CREATE TABLE "vinculaciones_telegram" (
    "id" TEXT NOT NULL,
    "alumno_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_vinculacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" TIMESTAMP(3),
    "fecha_ultimo_resumen" DATE,

    CONSTRAINT "vinculaciones_telegram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vinculaciones_telegram_alumno_id_key" ON "vinculaciones_telegram"("alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "vinculaciones_telegram_chat_id_key" ON "vinculaciones_telegram"("chat_id");

-- AddForeignKey
ALTER TABLE "vinculaciones_telegram" ADD CONSTRAINT "vinculaciones_telegram_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (mismo criterio que la migración habilitar_rls): sin políticas, las claves
-- anon y authenticated de Supabase no acceden a la tabla; el backend (Prisma) conecta como
-- dueño de las tablas y no se ve afectado.
ALTER TABLE "vinculaciones_telegram" ENABLE ROW LEVEL SECURITY;
