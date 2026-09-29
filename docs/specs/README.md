# Índice de Especificaciones Técnicas (Specs) — SAIE

Este directorio contiene las especificaciones técnicas completas y detalladas de todos los **118 issues** del proyecto **SAIE (Sistema de Asignación Inteligente de Espacios)**, organizadas por módulos/épicas para guiarse durante el desarrollo asistido por IA.

---

## 📚 Mapa de Specs por Épica y Módulo

| Archivo de Spec | Épica Principal | Issues Cubiertos | Descripción |
|---|---|---|---|
| [`01-setup-e-importadores.md`](./01-setup-e-importadores.md) | `epic:setup` | #1.1 — #1.10 | Estructura del proyecto, base de datos en Supabase, ORM Prisma y los 4 módulos de importación (Cursos, Horarios, Matrículas, Docentes). |
| [`02-motor-asignacion.md`](./02-motor-asignacion.md) | `epic:motor-asignacion` | #2.1 — #2.15 | Reglas del motor: capacidad real, disponibilidad, contigüidad, software, accesibilidad (Piso 1), cercanía entre secciones paralelas, batch y escalamiento. |
| [`03-portal-estudiante.md`](./03-portal-estudiante.md) | `epic:portal-estudiante` | #3.1 — #3.23 | Endpoints y componentes UI para consulta por código de alumno/curso, horarios, perfil, ficha médica, ruta de referencia y mapa 2D. |
| [`04-panel-alertas-y-admin.md`](./04-panel-alertas-y-admin.md) | `epic:panel-alertas` | #4.1 — #4.26 | Gestión de laboratorios/aulas, registro de PCs/software, alertas automáticas, mapa interactivo 2D/3D por piso, JWT, roles y cambio de claves. |
| [`05-portal-docente.md`](./05-portal-docente.md) | `epic:portal-docente` | #7.8 — #7.12 | Portal docente: consulta de horarios/asignaciones, exploración de espacios, reporte de incidencias y revisión/resolución por Jefatura. |
| [`06-estrategia-calidad-y-testing.md`](./06-estrategia-calidad-y-testing.md) | `epic:calidad` | #5.1 — #5.20 | Pruebas unitarias/parametrizadas (Jest), integración, E2E (Playwright), carga (k6), pipeline CI/CD (GitHub Actions), SonarCloud y Seed. |
| [`07-ui-ux-y-activos.md`](./07-ui-ux-y-activos.md) | `epic:docs` | #6.6, #6.7, #6.10 | Diseño UI/UX, tokens de estilos, componentes base React y maquetación de planos SVG por piso/pabellón. |

---

## 🛠️ Cómo Utilizar estas Specs

1. Cada spec define los **contratos TypeScript / DTOs**, las **reglas de negocio**, las **rutas API**, los **casos de prueba en Jest/Playwright** y los **Criterios de Aceptación (DoD)**.
2. Antes de codificar un issue, consulta la spec correspondiente para garantizar consistencia arquitectónica.
3. Toda modificación en los modelos o reglas de negocio debe verse reflejada en su respectiva spec.
