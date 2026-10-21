# Plan de Línea Base y Control de Cambios - SAIE

> **Sistema de Asignación Inteligente de Espacios (SAIE)**  
> Universidad Nacional Mayor de San Marcos — Facultad de Ingeniería de Sistemas e Informática  
> Escuela Académica Profesional de Ingeniería de Software — Grupo 6 (2026)  
> **Issue de referencia:** #191 (6.3) · **Versión:** 1.0.0 · **Fecha:** 2026-09-23

---

## 1. Propósito

Una línea base es un conjunto de entregables revisados y aprobados que, desde ese momento, solo cambian mediante un procedimiento formal. Este plan define:

1. Las tres líneas base del proyecto y qué congela cada una.
2. Quién las aprueba y cómo se registran en el repositorio.
3. El procedimiento para cambiar algo ya congelado.

Sin este procedimiento, cualquier documento puede modificarse en cualquier momento y las líneas base pierden sentido.

---

## 2. Roles

| Rol | Responsabilidad en la gestión de configuración | Integrante |
| :--- | :--- | :--- |
| **Gestor/a de Configuración (GC)** | Mantiene este plan, crea los tags de línea base, redacta las actas y lleva el registro de solicitudes de cambio. | Medrano Nikol |
| **Líder Técnico (LT)** | Evalúa el impacto técnico de los cambios sobre código, arquitectura y modelo de datos. | Melendez Andre |
| **Asegurador/a de Calidad (QA)** | Evalúa el impacto de los cambios sobre el plan de pruebas y verifica que los entregables cumplan sus criterios antes de congelarlos. | Carrasco Angel |
| **Equipo de desarrollo** | Solicita cambios y los implementa una vez aprobados. | Gutierrez Valery, Jimenez Angie |

### 2.1. Comité de Control de Cambios (CCC)

Integrado por **GC, LT y QA**. Decide por mayoría simple; con 2 votos a favor se aprueba. Si el cambio afecta a un entregable del que alguno de los tres es autor principal, participa igualmente, pero un cuarto integrante del equipo revisa el PR.

---

## 3. Líneas Base del Proyecto

| Línea base | Momento | Qué congela | Tag Git |
| :--- | :--- | :--- | :--- |
| **LB-F — Funcional** | Cierre del Sprint 0 | Qué debe hacer el sistema | `lb-funcional-vX.Y` |
| **LB-D — Diseño** | Cierre del Sprint 1 | Cómo se construye el sistema | `lb-diseno-vX.Y` |
| **LB-P — Producto** | Cierre del proyecto | El sistema entregado y su evidencia de calidad | `lb-producto-vX.Y` |

Las líneas base son acumulativas: LB-D incluye todo lo de LB-F en su versión vigente, y LB-P incluye LB-D.

### 3.1. LB-F — Línea Base Funcional

| Elemento de configuración | Ruta | Issue |
| :--- | :--- | :--- |
| Historias de usuario | `docs/01_historias_usuario.md` | #189 |
| Documento de requisitos (RF / RNF) | `docs/02_requisitos.md` | #189 |
| Modelo de reglas y alcance del MVP | `docs/03_alcance_y_reglas.md` | #190 |
| Plan Maestro de Pruebas | `docs/plan_maestro_pruebas.md` | #185 |
| Plan de Línea Base (este documento) | `docs/04_plan_linea_base.md` | #191 |

### 3.2. LB-D — Línea Base de Diseño

| Elemento de configuración | Ruta |
| :--- | :--- |
| Documento de Arquitectura | `docs/arquitectura.md` |
| Documento de Modelo de Datos | `docs/modelo-datos.md` |
| Esquema de base de datos | `backend/prisma/schema.prisma` y migraciones |
| Contrato de la API REST (endpoints, DTOs, códigos de error) | `docs/` (documento a definir en Sprint 1) |
| Planos SVG por piso | `assets/planos/` |
| Flujo de trabajo Git | `docs/git-workflow.md` |

### 3.3. LB-P — Línea Base de Producto

| Elemento de configuración | Ruta / ubicación |
| :--- | :--- |
| Código fuente de la versión entregada | Rama `main` en el tag `lb-producto-v1.0` |
| Pipeline CI/CD y configuración de calidad | `.github/workflows/`, `sonar-project.properties` |
| Suites de prueba | `tests/`, `backend/**/*.test.ts` |
| Evidencia de calidad (cobertura, SonarCloud, reportes k6 y Playwright) | GitHub Release del tag |
| README e instrucciones de despliegue | `README.md` |

### 3.4. Lo que **no** está bajo línea base

Borradores en ramas `feature/*` o `docs/*`, issues, tableros del proyecto y actas de reunión. Se pueden modificar libremente hasta que se integran a una línea base.

---

## 4. Cómo se Establece una Línea Base

1. **Revisión:** cada elemento se integra a `develop` mediante PR aprobado, cumpliendo sus criterios de aceptación.
2. **Verificación QA:** QA confirma que la lista de elementos de la sección 3 está completa y que no hay PRs abiertos que los modifiquen.
3. **Integración:** se hace el PR de `develop` → `main`.
4. **Congelamiento:** GC crea el tag anotado sobre el commit de `main`:
   ```bash
   git checkout main && git pull
   git tag -a lb-funcional-v1.0 -m "Línea base funcional v1.0 — Acta LB-F-01"
   git push origin lb-funcional-v1.0
   ```
5. **Acta:** GC registra el acta en `docs/actas/` con el hash del commit y la aprobación del CCC (ver sección 7), y la vincula al issue #192.

---

## 5. Procedimiento de Control de Cambios

Aplica a **cualquier modificación de un elemento ya congelado**, incluidas correcciones de redacción que cambien el significado.

```
1. SOLICITUD
   └─ Quien necesita el cambio abre un issue con la plantilla
      "Solicitud de cambio" (label: cambio-lb)

2. ANÁLISIS DE IMPACTO
   └─ LT y QA completan en el issue:
      ├─ Elementos afectados (docs, código, pruebas)
      ├─ Esfuerzo estimado
      └─ Riesgo sobre el sprint en curso

3. DECISIÓN DEL CCC
   ├─ Aprobado  → label cambio-aprobado
   ├─ Rechazado → se cierra el issue con la justificación
   └─ Diferido  → se asigna a un sprint posterior

4. IMPLEMENTACIÓN
   └─ Rama docs/<issue-id>-... o feature/<issue-id>-...
      ├─ Se actualiza la tabla "Control de Cambios" de cada documento
      └─ PR con "Closes #<solicitud>"

5. NUEVA VERSIÓN DE LA LÍNEA BASE
   └─ Tras el merge a main, GC crea el nuevo tag
      (ej. lb-funcional-v1.1) y registra un acta de actualización
```

### 5.1. Versionado

* **Documentos:** versión semántica `MAYOR.MENOR.PARCHE` en su tabla de control de cambios.
  * `MAYOR`: cambia el alcance o se agrega/elimina un requisito o regla.
  * `MENOR`: cambia el contenido sin alterar el alcance (ej. se precisa un criterio de aceptación).
  * `PARCHE`: correcciones de forma sin cambio de significado.
* **Tags de línea base:** `vX.Y`, incrementando `Y` por cada cambio aprobado y `X` si el cambio es de versión mayor en algún elemento.

### 5.2. Cambios de forma

Las correcciones ortográficas o de formato que **no** cambian el significado no requieren decisión del CCC: basta un PR aprobado por un revisor con la etiqueta `cambio-forma`. Se acumulan y se congelan en la siguiente versión de la línea base.

### 5.3. Cambios urgentes

Si un cambio bloquea el sprint en curso, GC puede convocar al CCC de forma asíncrona en el propio issue; la decisión se toma con los votos registrados como comentarios en un plazo máximo de 24 horas.

---

## 6. Protección en el Repositorio

* `main` protegida: sin push directo, con al menos 1 aprobación y checks de CI en verde.
* Los tags `lb-*` no se mueven ni se borran. Una corrección siempre genera un tag nuevo.
* La plantilla de solicitud de cambio vive en `.github/ISSUE_TEMPLATE/solicitud-cambio.md`.

---

## 7. Plantilla de Acta de Aprobación

Las actas se guardan en `docs/actas/` con el nombre `acta-<lb>-<nn>.md` (ej. `acta-lb-funcional-01.md`) y siguen esta estructura:

```markdown
# Acta de Aprobación — <Línea base> v<X.Y>

| Campo | Valor |
| :--- | :--- |
| Código de acta | LB-<F|D|P>-<nn> |
| Línea base | <Funcional | Diseño | Producto> |
| Versión | v<X.Y> |
| Fecha de aprobación | AAAA-MM-DD |
| Commit de `main` | <hash> |
| Tag | lb-<...>-v<X.Y> |

## Elementos congelados
| Elemento | Ruta | Versión | Issue |

## Verificación previa
- [ ] Todos los elementos están en `main`
- [ ] Sin PRs abiertos que los modifiquen
- [ ] Criterios de aceptación de los issues cumplidos

## Aprobación del CCC
| Rol | Integrante | Decisión | Fecha |

## Observaciones y pendientes
```

---

## Control de Cambios

| Versión | Fecha | Autor | Descripción |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-09-23 | Grupo 6 | Versión inicial. |
