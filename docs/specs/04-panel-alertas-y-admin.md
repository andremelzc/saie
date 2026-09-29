# Spec 04: Panel de Alertas y Administración

> **Épica:** `epic:panel-alertas`  
> **Issues Cubiertos:** #4.1 — #4.26  
> **Roles:** BI, FE, QA  
> **Documentos de Referencia:** [`docs/modelo-datos.md`](../modelo-datos.md), [`docs/arquitectura.md`](../arquitectura.md)

---

## 1. Visión General del Módulo

El **Panel de Alertas y Administración** es la consola de gestión para Coordinación Académica y Jefatura de Laboratorios. Sus funciones centrales son:
1. **Monitorear Alertas Automáticas:** Detección automática de conflictos de software o capacidad reducida en asignaciones vigentes tras la falla de PCs o cambios de software.
2. **Mapa de Ocupación Interactivo (2D/3D):** Visualización del estado del edificio por piso.
3. **Gestión de Espacios y Secciones Escaladas:** Alta/edición de espacios con campos acotados por rol y revisión manual de asignaciones no concluidas.
4. **Seguridad y Control de Acceso:** Autenticación JWT, control de roles (`COORDINACION_ACADEMICA`, `JEFATURA_LABORATORIO`) y cambio/restablecimiento de clave.

---

## 2. Endpoints HTTP y Lógica de Negocio

### 2.1 Alertas por Software y Capacidad (#4.1, #4.2, #4.3, #4.4, #4.5, #4.6, #4.7, #4.10)
* `POST /api/v1/admin/laboratorios/:id/software`
  * Jefatura registra cambio de software instalado en laboratorio.
  * Dispara `evaluarIncompatibilidadSoftware(laboratorioId)` $\rightarrow$ Genera registros en `Alerta` (tipo `SOFTWARE`) para asignaciones afectadas.
* `POST /api/v1/admin/laboratorios/:id/pcs-malogradas`
  * Jefatura registra cambio de PCs malogradas.
  * Recalcula $CapacidadReal$ $\rightarrow$ Dispara `evaluarCapacidadInsuficiente(laboratorioId)` $\rightarrow$ Genera `Alerta` (tipo `CAPACIDAD`).
* `GET /api/v1/admin/alertas`
  * Listado de alertas activas (filtradas por responsabilidad en caso de Jefatura).
* `PATCH /api/v1/admin/alertas/:id/resolver`
  * Marca alerta como resuelta.

### 2.2 Mapa Visual de Ocupación por Piso (2D & 3D) (#4.11, #4.12, #4.13, #4.14, #4.15, #4.23, #4.24)
* `GET /api/v1/admin/mapa-ocupacion?pabellon=A&piso=1`
  * Estado de cada espacio (`DISPONIBLE`, `OCUPADO`, `ALERTA_ACTIVA`), curso asignado, docente y aforo actual.
* **Mapa 2D (React + SVG):** Renderiza el plano del piso coloreando los espacios dinámicamente.
* **Mapa 3D (Three.js):** Maqueta extruida navegable basada en los planos SVG.

### 2.3 Gestión de Espacios y Secciones Escaladas (#4.15, #4.16, #4.17, #4.18, #4.20, #4.21, #4.22, #4.25, #4.26)
* `GET /api/v1/admin/secciones-escaladas`
  * Lista las secciones que no pudieron ser asignadas en la corrida batch y requieren revisión manual.
* `POST /api/v1/admin/usuarios/restablecer-clave`
  * Permite a Coordinación Académica restablecer la clave de cualquier alumno o docente.

---

## 3. Seguridad y Control por Rol (#4.8, #4.21, #4.25)
* Middleware `authGuard`: Verifica el JWT bearer token.
* Middleware `roleGuard`:
  * `COORDINACION_ACADEMICA`: Acceso total.
  * `JEFATURA_LABORATORIO`: Edición limitada a los laboratorios asignados en `EspacioResponsable`.

---

## 4. Definition of Done (DoD)
- [ ] Alertas automáticas persistidas transaccionalmente tras actualizar PCs o software.
- [ ] Rendimiento del mapa visual $< 100\text{ ms}$ en cambio de piso.
- [ ] Cobertura de tests unitarios/integración de controladores $\ge 85\%$.
