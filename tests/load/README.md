# Pruebas de Carga — SAIE (Issue #180 / 5.8)

Este directorio contiene las pruebas de carga automatizadas con **k6** para validar el comportamiento del sistema bajo alta concurrencia, en particular el cumplimiento del requisito **RNF-01** (pico de tráfico del primer día de clases).

---

## 🎯 Escenario: Pico del Primer Día de Clases (`pico_primer_dia.js`)

Simula el momento crítico en que los estudiantes y docentes consultan simultáneamente sus asignaciones de aula y laboratorio a través de los endpoints públicos del sistema.

### 📌 Endpoints Evaluados
* `GET /api/v1/consulta/alumno/:codigoAlumno` (Issue 3.2)
* `GET /api/v1/consulta/curso/:codigoCurso` (Issue 3.4)

### 📊 Umbrales de Aceptación Mandatorios (SLA / DoD)
| Métrica | Umbral | Criterio / Justificación |
|---|---|---|
| **Latencia p95** (`latencia_consulta_p95` / `http_req_duration`) | `< 2000 ms` | El 95 % de las peticiones debe responder en menos de 2 segundos bajo carga concurrente de 300 VUs (RNF-01). |
| **Tasa de error** (`tasa_error` / `http_req_failed`) | `< 1 %` | Tasa de fallos menor al 1%. Los códigos `404` controlados (código inexistente según RF-10) se consideran respuestas válidas y no computan como fallo. |

---

## 💻 Entorno de Ejecución Declarado

> **IMPORTANTE (§2.2 Plan Maestro de Pruebas):**  
> Estas pruebas de carga deben ejecutarse **exclusivamente sobre un entorno local o de CI/CD** con la misma configuración de base de datos y backend que producción.  
> **NUNCA se debe ejecutar contra la instancia gratuita desplegada (Render / Supabase)**, ya que el *cold start* de los servicios gratuitos y las pausas por inactividad distorsionarían las mediciones de latencia y disponibilidad.

---

## 🚀 Cómo Ejecutar las Pruebas

### 1. Prerrequisitos
Tener `k6` instalado en tu sistema ([k6 installation guide](https://k6.io/docs/get-started/installation/)).

### 2. Levantar el Backend Localmente
```bash
cd backend
npm run dev
```

### 3. Ejecución del Escenario Completo (300 VUs / 5 minutos)
```bash
# Desde la raíz del monorepo:
k6 run tests/load/pico_primer_dia.js

# O con URL personalizada:
BASE_URL=http://localhost:3000 k6 run tests/load/pico_primer_dia.js
```

### 4. Ejecución Rápida de Verificación (Smoke / CI)
```bash
FAST_TEST=1 TARGET_VUS=20 k6 run tests/load/pico_primer_dia.js
```

---

## 📋 Protocolo de Manejo de Fallas
Si alguna corrida supera el umbral de latencia ($p95 \ge 2000\text{ ms}$) o la tasa de error ($\ge 1\%$):
1. **No corregir silenciosamente.**
2. Abrir inmediatamente un issue de tipo `bug` en GitHub con la etiqueta `performance` referenciando el **Issue #180**.
3. Adjuntar las métricas arrojadas por k6 en el cuerpo del issue para su optimización (Issue 5.19).
