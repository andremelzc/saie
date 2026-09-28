# Spec 05: Portal Docente y Gestión de Incidencias

> **Épica:** `epic:portal-docente`  
> **Issues Cubiertos:** #7.8, #7.9, #7.10, #7.11, #7.12  
> **Roles:** FE, BI, QA  
> **Documentos de Referencia:** [`docs/modelo-datos.md`](../modelo-datos.md), [`docs/arquitectura.md`](../arquitectura.md)

---

## 1. Visión General del Módulo

El **Portal Docente** permite a los profesores consultar sus asignaciones activas, explorar la disponibilidad de espacios en la facultad, verificar el estado de equipos en sus laboratorios y reportar incidencias técnicas (equipos defectuosos, falta de proyector, problemas de espacio).

Asimismo, incluye el panel de revisión y resolución de incidencias para la **Jefatura de Laboratorios**.

---

## 2. Componentes e Endpoints

### 2.1 Consulta Docente (#7.8, #7.9, #7.12)
* `GET /api/v1/docente/horario`
  * Horario semanal y espacios asignados del docente autenticado.
* `GET /api/v1/docente/laboratorio-estado/:espacioId`
  * Consulta detallada del número de PCs operativas, software instalado e historial de cambios antes de su clase.
* `GET /api/v1/docente/espacios/explorador`
  * Explorador de aulas y laboratorios para consultar disponibilidad de espacios libres.

### 2.2 Reporte de Incidencias por Docente (#7.10)
* `POST /api/v1/docente/incidencias`
  * Firma del DTO:
    ```typescript
    export interface CrearIncidenciaDTO {
      espacioId: string;
      asunto: string;
      descripcion: string;
      prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
    }
    ```
  * Registra la incidencia vinculada al espacio y docente.

### 2.3 Revisión y Resolución por Jefatura (#7.11)
* `GET /api/v1/admin/incidencias`
  * Lista de incidencias reportadas en laboratorios a su cargo.
* `PATCH /api/v1/admin/incidencias/:id/resolver`
  * Marca la incidencia como `RESUELTA` o `DESCARTADA` con comentario de cierre.

---

## 3. Definition of Done (DoD)
- [ ] Interfaz limpia y responsiva para el docente.
- [ ] Trazabilidad completa de incidencias reportadas en auditoría.
- [ ] Cobertura de pruebas unitarias/integración $\ge 85\%$.
