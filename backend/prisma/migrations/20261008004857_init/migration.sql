-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoEspacio" AS ENUM ('AULA_TEORICA', 'LABORATORIO');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "RolCuenta" AS ENUM ('ALUMNO', 'DOCENTE', 'COORDINACION_ACADEMICA', 'JEFATURA_LABORATORIOS');

-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('VIGENTE', 'ESCALADA', 'HISTORICA');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('SOFTWARE', 'CAPACIDAD');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('PENDIENTE', 'RESUELTA');

-- CreateEnum
CREATE TYPE "TipoIncidencia" AS ENUM ('EQUIPO_NO_OPERATIVO', 'SOFTWARE_FALTANTE', 'OTRO');

-- CreateEnum
CREATE TYPE "PrioridadIncidencia" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('PENDIENTE', 'RESUELTA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "CampoHistorialEspacio" AS ENUM ('SOFTWARE', 'PCS_MALOGRADAS');

-- CreateEnum
CREATE TYPE "TipoEventoAuditoria" AS ENUM ('ASIGNACION', 'ESCALAMIENTO', 'ALERTA');

-- CreateTable
CREATE TABLE "espacios" (
    "id" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "tipo" "TipoEspacio" NOT NULL,
    "pabellon" TEXT NOT NULL,
    "piso" INTEGER NOT NULL,
    "aforo_nominal" INTEGER NOT NULL,
    "software_instalado" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pcs_malogradas" INTEGER,

    CONSTRAINT "espacios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espacios_contiguos" (
    "espacio_id_a" TEXT NOT NULL,
    "espacio_id_b" TEXT NOT NULL,

    CONSTRAINT "espacios_contiguos_pkey" PRIMARY KEY ("espacio_id_a","espacio_id_b")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secciones" (
    "id" TEXT NOT NULL,
    "curso_id" TEXT NOT NULL,
    "docente_id" TEXT,
    "codigo_seccion" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "tipo_espacio_requerido" "TipoEspacio" NOT NULL,
    "stack_software_requerido" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "secciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios" (
    "id" TEXT NOT NULL,
    "seccion_id" TEXT NOT NULL,
    "dia_semana" "DiaSemana" NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,

    CONSTRAINT "horarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" TEXT NOT NULL,
    "alumno_id" TEXT NOT NULL,
    "seccion_id" TEXT NOT NULL,
    "movilidad_reducida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumnos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "dni" TEXT,
    "fecha_nacimiento" TIMESTAMP(3),
    "telefono" TEXT,
    "direccion" TEXT,
    "cuenta_id" TEXT,

    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_medicas" (
    "alumno_id" TEXT NOT NULL,
    "tipo_sangre" TEXT,
    "alergias" TEXT,
    "condicion_especial" TEXT,
    "contacto_emergencia" TEXT,

    CONSTRAINT "fichas_medicas_pkey" PRIMARY KEY ("alumno_id")
);

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "codigo_docente" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo_institucional" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "cuenta_id" TEXT,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "rol" "RolCuenta" NOT NULL,
    "usuario_login" TEXT NOT NULL,
    "clave_hash" TEXT NOT NULL,
    "debe_cambiar_clave" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones" (
    "id" TEXT NOT NULL,
    "seccion_id" TEXT NOT NULL,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'VIGENTE',
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo_escalamiento" TEXT,
    "corrida_id" TEXT,
    "huella_entrada" TEXT,

    CONSTRAINT "asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_espacios" (
    "asignacion_id" TEXT NOT NULL,
    "espacio_id" TEXT NOT NULL,

    CONSTRAINT "asignaciones_espacios_pkey" PRIMARY KEY ("asignacion_id","espacio_id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "espacio_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "fecha_deteccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_asignaciones_afectadas" (
    "alerta_id" TEXT NOT NULL,
    "asignacion_id" TEXT NOT NULL,

    CONSTRAINT "alertas_asignaciones_afectadas_pkey" PRIMARY KEY ("alerta_id","asignacion_id")
);

-- CreateTable
CREATE TABLE "incidencias" (
    "id" TEXT NOT NULL,
    "docente_id" TEXT NOT NULL,
    "asignacion_id" TEXT NOT NULL,
    "espacio_id" TEXT NOT NULL,
    "tipo" "TipoIncidencia" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "PrioridadIncidencia" NOT NULL DEFAULT 'MEDIA',
    "evidencia" TEXT,
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_reporte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identificador_seguimiento" TEXT NOT NULL,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_espacios" (
    "id" TEXT NOT NULL,
    "espacio_id" TEXT NOT NULL,
    "campo" "CampoHistorialEspacio" NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT NOT NULL,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cuenta_id" TEXT NOT NULL,

    CONSTRAINT "historial_espacios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espacios_responsables" (
    "cuenta_id" TEXT NOT NULL,
    "espacio_id" TEXT NOT NULL,

    CONSTRAINT "espacios_responsables_pkey" PRIMARY KEY ("cuenta_id","espacio_id")
);

-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" TEXT NOT NULL,
    "tipo_evento" "TipoEventoAuditoria" NOT NULL,
    "asignacion_id" TEXT,
    "alerta_id" TEXT,
    "detalle" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "espacios_pabellon_identificador_key" ON "espacios"("pabellon", "identificador");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_codigo_key" ON "cursos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "secciones_curso_id_codigo_seccion_periodo_key" ON "secciones"("curso_id", "codigo_seccion", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "horarios_seccion_id_dia_semana_hora_inicio_key" ON "horarios"("seccion_id", "dia_semana", "hora_inicio");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_alumno_id_seccion_id_key" ON "matriculas"("alumno_id", "seccion_id");

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_codigo_key" ON "alumnos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_cuenta_id_key" ON "alumnos"("cuenta_id");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_codigo_docente_key" ON "docentes"("codigo_docente");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_cuenta_id_key" ON "docentes"("cuenta_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_usuario_login_key" ON "cuentas"("usuario_login");

-- CreateIndex
CREATE UNIQUE INDEX "incidencias_identificador_seguimiento_key" ON "incidencias"("identificador_seguimiento");

-- AddForeignKey
ALTER TABLE "espacios_contiguos" ADD CONSTRAINT "espacios_contiguos_espacio_id_a_fkey" FOREIGN KEY ("espacio_id_a") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacios_contiguos" ADD CONSTRAINT "espacios_contiguos_espacio_id_b_fkey" FOREIGN KEY ("espacio_id_b") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_medicas" ADD CONSTRAINT "fichas_medicas_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docentes" ADD CONSTRAINT "docentes_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "secciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_espacios" ADD CONSTRAINT "asignaciones_espacios_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "asignaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_espacios" ADD CONSTRAINT "asignaciones_espacios_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_asignaciones_afectadas" ADD CONSTRAINT "alertas_asignaciones_afectadas_alerta_id_fkey" FOREIGN KEY ("alerta_id") REFERENCES "alertas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_asignaciones_afectadas" ADD CONSTRAINT "alertas_asignaciones_afectadas_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "asignaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "asignaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_espacios" ADD CONSTRAINT "historial_espacios_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_espacios" ADD CONSTRAINT "historial_espacios_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacios_responsables" ADD CONSTRAINT "espacios_responsables_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacios_responsables" ADD CONSTRAINT "espacios_responsables_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "asignaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_alerta_id_fkey" FOREIGN KEY ("alerta_id") REFERENCES "alertas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

