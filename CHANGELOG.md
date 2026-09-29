# Registro de Versiones (Changelog) — SAIE

> **Proyecto:** SAIE (Sistema de Asignación Inteligente de Espacios)  
> **Issue Vinculado:** [#196 - Issue 6.8](https://github.com/andremelzc/saie/issues/196)  
> **Estándar:** [Keep a Changelog 1.0.0](https://keepachangelog.com/es-ES/1.0.0/)

---

## [1.2.0] - 2026-09-29
### Añadido (Sprint 1 - Motor de Asignación Base)
- **Regla 1 - Capacidad Real (`calcularCapacidadReal`):** Retorna $AforoNominal$ para aulas teóricas y $\max(0, AforoNominal - PCsMalogradas)$ para laboratorios.
- **Regla 2 - Grafo de Contigüidad (`sembrarEspaciosYContiguedades`):** Seed e interfaz para adjacencia de aulas en el mismo piso/pabellón.
- **Regla 3 - Consulta de Espacios Contiguos (`obtenerEspaciosContiguos`):** Búsqueda BFS de espacios adyacentes del mismo tipo.
- **Regla 4 - Disponibilidad (`calcularEspaciosDisponibles`):** Verificación de no doble reserva contra asignaciones vigentes.
- **Regla 5 - Algoritmo de Bloque Contiguo (`buscarBloqueContiguo`):** Expansión codiciosa (greedy) de bloques hasta satisfacer la suma de aforo requerido.

---

## [1.1.0] - 2026-09-28
### Añadido (Sprint 1 - Importadores de Datos)
- **Importador de Cursos y Secciones:** Ingesta de CSV/JSON para `Curso` y `Seccion` (`cursosSecciones.importer.ts`).
- **Importador de Horarios:** Ingesta de `HorarioSeccion` con validación de franjas temporales (`horarios.importer.ts`).
- **Importador de Matrículas:** Ingesta de `Matricula` registrando el flag `movilidadReducida` por alumno (`matriculas.importer.ts`).
- **Importador de Docentes:** Ingesta de perfil de profesores (`docentes.importer.ts`).
- **Orquestador Principal:** Módulo unificado de ejecución de importaciones (`importers/index.ts`).

---

## [1.0.0] - 2026-09-27
### Añadido (Fundamentos & CI/CD)
- **Estructura Monorepo:** Configuración de workspaces npm (`backend` + `frontend`).
- **Modelo de Datos Prisma:** Esquema en PostgreSQL (Supabase) con enums, tablas y relaciones.
- **Pipeline CI/CD (GitHub Actions):** `.github/workflows/ci.yml` ejecutando linting (ESLint), formateo (Prettier) y pruebas unitarias (Jest).
- **Especificaciones Técnicas (Specs):** Índice y specs en `docs/specs/` para los 118 issues de las 7 épicas.
- **Reglas del Agente (`AGENTS.md`):** Protocolos y delimitación estricta de roles de desarrollo (`BI`, `BM`, `FE`) vs QA (`Angel14den`).
