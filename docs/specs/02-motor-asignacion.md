# Spec 02: Motor de Asignación Inteligente de Espacios

> **Épica:** `epic:motor-asignacion`  
> **Issues Cubiertos:** #2.1, #2.2, #2.3, #2.4, #2.5, #2.6, #2.7, #2.8, #2.9, #2.10, #2.11, #2.12, #2.13, #2.14, #2.15  
> **Roles:** BM, QA  
> **Documentos de Referencia:** [`docs/modelo-datos.md`](../modelo-datos.md), [`docs/arquitectura.md`](../arquitectura.md)

---

## 1. Visión General del Motor de Reglas

El motor de asignación calcula automáticamente el mejor bloque contiguo de aulas o laboratorios para cada sección académica. Opera bajo un conjunto de **5 reglas unificadas**:

1. **Capacidad Real:** Aforo nominal sin cambios en aulas teóricas; $AforoNominal - PCsMalogradas$ en laboratorios.
2. **Disponibilidad:** 0 solapamientos de horario en franjas activas.
3. **Contigüidad Estricta:** Espacios contiguos en el mismo piso/pabellón, sin mezclar aulas con laboratorios.
4. **Matriz de Software:** Evaluada obligatoriamente solo cuando la sección requiere laboratorio. Omisión automática para aulas teóricas.
5. **Accesibilidad y Cercanía Paralela:** Priorización de Piso 1 para estudiantes con movilidad reducida y minimización de distancia entre secciones paralelas del mismo curso.

---

## 2. Componentes e Issues Técnicos

### 2.1 Issues 2.1 a 2.5 — Piezas Base
* **Issue 2.1 (`calcularCapacidadReal`):**
  $$CapacidadReal = \begin{cases} AforoNominal & \text{si } tipo = AULA\_TEORICA \\ \max(0, AforoNominal - PCsMalogradas) & \text{si } tipo = LABORATORIO \end{cases}$$
* **Issue 2.2 (`EspacioContiguo`):** Relación de adjacencia no dirigida en base de datos.
* **Issue 2.3 (`obtenerEspaciosContiguos`):** Consulta BFS/DFS del grafo de contigüidad por tipo y piso.
* **Issue 2.4 (`verificarDisponibilidad`):** Validación contra asignaciones `VIGENTE` en la misma franja horaria.
* **Issue 2.5 (`buscarBloqueContiguo`):** Algoritmo codicioso (greedy) de expansión de bloques hasta satisfacer la suma de capacidad real requerida.

### 2.2 Issues 2.6 a 2.9 — Reglas de Negocio Avanzadas
* **Issue 2.6 (Matriz de Software):**
  * `validarSoftwareLaboratorio(laboratorioIds: string[], softwareRequerido: string[]): boolean`
  * Verifica que todos los programas requeridos estén presentes en el historial activo del laboratorio.
* **Issue 2.7 (Accesibilidad - Piso 1):**
  * Si la sección tiene al menos 1 alumno con `movilidadReducida === true`, se prioriza la ordenación de bloques candidatos ubicados en `piso = 1`.
* **Issue 2.8 & 2.13 (Cercanía entre Secciones Paralelas):**
  * Función de puntuación de distancia física ($PuntajeCercania$) que premia bloques en el mismo piso o piso adyacente respecto a las secciones ya asignadas del mismo curso.
* **Issue 2.9 (Desempate de Bloques Candidatos):**
  * En caso de múltiples bloques válidos, desempata por: (1) Piso 1 si hay movilidad reducida, (2) Mayor puntuación de cercanía entre secciones paralelas, (3) Menor desperdicio de aforo residual.

### 2.3 Issues 2.10 a 2.15 — Orquestación, Batch y Escalamiento
* **Issue 2.10 (`orquestarAsignacionSeccion`):**
  * Orquesta el flujo completo para una sección individual.
  * Si ningún bloque cumple con las 5 reglas, asigna el estado `ESCALADA` a revisión manual.
* **Issue 2.11 (`ejecutarCorridaBatch`):**
  * Procesa todas las secciones no asignadas del periodo en un solo lote determinista.
  * **Idempotencia:** Si los requerimientos de la sección no han cambiado, preserva la asignación `VIGENTE`.
* **Issue 2.12 (Escalamiento a Revisión Manual):**
  * Registra las secciones sin bloque disponible en la tabla de secciones escaladas con la razón exacta del fallo (capacidad insuficiente, software faltante, horario bloqueado).
* **Issue 2.14 & 2.15 (Trigger e Integración HTTP):**
  * Endpoint HTTP: `POST /api/v1/asignaciones/batch` y `POST /api/v1/asignaciones/seccion/:id`.

---

## 3. Matriz de Pruebas Unitarias & Integración
- `tests/unit/rules/calcularCapacidadReal.test.ts` (#5.1)
- `tests/unit/services/contiguedad.test.ts` (#5.2)
- `tests/unit/services/disponibilidad.test.ts` (#5.3)
- `tests/unit/rules/buscarBloqueContiguo.test.ts` (#5.4)
- `tests/unit/rules/validarSoftware.test.ts` (#5.5)
- `tests/unit/rules/accesibilidad.test.ts` (#5.6)
- `tests/integration/motorPipeline.test.ts` (#5.7)

---

## 4. Definition of Done (DoD)
- [ ] Reglas del motor 100% puras, sin acoplamiento a frameworks de UI.
- [ ] Procesamiento de corrida batch determinista e idempotente.
- [ ] Cobertura de pruebas unitarias $\ge 85\%$.
