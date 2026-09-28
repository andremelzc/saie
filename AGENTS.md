# Guía de Trabajo Asistido por IA — Proyecto SAIE

> **Propósito:** Definir el comportamiento, flujo de trabajo y estándares de desarrollo que cualquier agente de IA (Antigravity / Gemini) debe seguir al trabajar en el repositorio **SAIE**.

---

## 📌 Contexto y Stack del Proyecto

**SAIE — Sistema de Asignación Inteligente de Espacios**
* **Monorepo:** `/backend` (Node.js + Express + TypeScript), `/frontend` (React + TypeScript + Vite + Tailwind CSS), `/docs` (Documentación), `/assets` (Planos SVG).
* **Base de Datos & ORM:** PostgreSQL (Supabase) con Prisma ORM (`backend/prisma/schema.prisma`).
* **Pruebas:** Jest (unitarias/parametrizadas), Playwright (E2E), k6 (carga).
* **Rama Principal de Trabajo:** `develop` (Protegida contra borrado y force push).

---

## ⚙️ Reglas de Trabajo del Agente de IA

### 1. Spec-Driven Development (Obligatorio)
* Antes de escribir código para cualquier issue o tarea, **consulta siempre la especificación técnica correspondiente** en `docs/specs/` (revisa `docs/specs/README.md` para el mapeo).
* Obedece estrictamente las firmas de funciones, contratos DTO y esquemas Zod definidos en las specs.

### 2. Desarrollo Guiado por Pruebas (TDD)
* Para cada función o regla de negocio construida en el backend (`backend/src/rules/` o `backend/src/services/`), escribe su suite de pruebas correspondiente en `backend/tests/unit/`.
* Nunca declares completado un issue sin antes ejecutar las pruebas (`npm run test` en backend) y verificar que pasen en verde.

### 3. Preservación del Modelo de Datos
* Respeta la distinción entre **Aulas Teóricas** (sin PCs, capacidad real = aforo nominal) y **Laboratorios** (con PCs malogradas y matriz de software).
* Si modificas el archivo `schema.prisma`, asegúrate de actualizar el cliente de Prisma (`npx prisma generate`).

### 4. Calidad y Formato de Código
* Garantiza 0 errores de compilación TypeScript (`npx tsc --noEmit`).
* Manten la cobertura de código $\ge 85\%$ en las funciones del motor y los servicios.
* Sigue convenciones de commits semánticos (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

---

## 🚀 Comandos Útiles para el Agente

* **Ejecutar Pruebas Backend:** `cd backend && npm run test`
* **Validar Compilación TypeScript:** `cd backend && npx tsc --noEmit`
* **Generar Cliente Prisma:** `cd backend && npx prisma generate`
