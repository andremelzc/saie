-- Habilita Row Level Security en todas las tablas del modelo.
-- Supabase expone el esquema public por su API REST: sin RLS, quien tenga la clave anon
-- podría leer datos sensibles (claves hash, DNI, fichas médicas).
-- Sin políticas, anon y authenticated quedan sin acceso. El backend (Prisma) se conecta
-- como dueño de las tablas, que no está sujeto a RLS, así que no se ve afectado.

ALTER TABLE "espacios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "espacios_contiguos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cursos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "secciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "horarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "matriculas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alumnos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fichas_medicas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "docentes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cuentas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asignaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asignaciones_espacios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alertas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alertas_asignaciones_afectadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incidencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "historial_espacios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "espacios_responsables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registros_auditoria" ENABLE ROW LEVEL SECURITY;
