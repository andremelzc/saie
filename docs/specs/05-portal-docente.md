# Spec 05: Portal Docente y Gestión de Incidencias

> **Épica:** `epic:portal-docente`  
> **Issues Cubiertos:** #7.1 — #7.12  
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
* `GET /api/v1/docente/laboratorio-estado/:espacioId` (Issue 7.4)
  * Solo laboratorios donde el docente tiene una asignación `VIGENTE`; en cualquier otro caso 404 (no se revela qué espacios existen).
  * Respuesta: `{ laboratorio: { id, identificador, pabellon, piso, aforoNominal, pcsMalogradas, pcsOperativas, softwareInstalado: [{ id, nombre, version }] }, cursos: [{ asignacionId, codigoCurso, nombreCurso, codigoSeccion, softwareRequerido: [{ id, nombre, version, comparacionVersion }], softwareFaltante, cumple }], historial: [{ campo, valorAnterior, valorNuevo, fechaCambio }] }`.
  * `pcsOperativas` es la capacidad real (Issue 2.1). `cursos` compara el stack que exige cada curso del docente con lo instalado (`validarSoftwareLaboratorio`). El historial trae los últimos 20 cambios, del más reciente al más antiguo.
* `GET /api/v1/docente/espacios/explorador`
  * Explorador de aulas y laboratorios para consultar disponibilidad de espacios libres.

### 2.2 Reporte de Incidencias por Docente (#7.10)
* `POST /api/v1/docente/incidencias` (Issue 7.5)
  * Firma del DTO (el que valida `CrearIncidenciaSchema`):
    ```typescript
    export interface CrearIncidenciaDTO {
      asignacionId: string;   // asignación VIGENTE de una sección del docente
      espacioId: string;      // debe formar parte del bloque asignado
      tipo: 'EQUIPO_NO_OPERATIVO' | 'SOFTWARE_FALTANTE' | 'OTRO';
      descripcion: string;    // 5 a 1000 caracteres
      prioridad?: 'BAJA' | 'MEDIA' | 'ALTA';  // por defecto MEDIA
      evidencia?: string;     // hasta 500 caracteres
    }
    ```
  * Registra la incidencia vinculada al espacio y docente y devuelve su `id` y su `identificadorSeguimiento` (`INC-` + 8 hex).
* `POST /api/v1/docente/incidencias/:id/imagen` y `GET /api/v1/docente/incidencias/:id/imagen` (Issue 7.19, riesgo R45)
  * Foto del problema como evidencia (una por incidencia; subir otra la reemplaza). El cuerpo es el archivo tal cual, con `Content-Type` `image/jpeg`, `image/png` o `image/webp`, de hasta 2 MB. El tipo se comprueba por la firma del archivo, no solo por la cabecera.
  * 415 si no es una de esas imágenes (aunque diga serlo), 413 si supera 2 MB, 404 si la incidencia no es del docente, 409 si ya no está pendiente. Respuesta: `201 { tipoMime, tamanoBytes }`.
  * Se guarda en la base (tabla `imagenes_incidencia`, migración `20261201000000_imagenes_incidencia`, con RLS y `CHECK` de tipo y tamaño), sin depender de un almacenamiento externo. Los listados traen `tieneImagen`; los bytes se piden aparte.
  * En el portal: «Foto del problema (opcional)» en el reporte; se sube después de registrar la incidencia y, si falla, la incidencia queda registrada y se avisa. El enlace sigue como opción secundaria («O un enlace»).
* `GET /api/v1/docente/incidencias` (Issue 7.14)
  * Devuelve solo las incidencias del docente autenticado (el id sale del token), de la más reciente a la más antigua. Sin filtros ni paginación: un docente reporta pocas.
  * Cada incidencia (`IncidenciaDocenteDTO`, el contrato de `IncidenciaAdminDTO` sin `docente`): `{ id, identificadorSeguimiento, tipo, prioridad, estado, descripcion, evidencia, fechaReporte, comentarioCierre, fechaCierre, espacio: { id, identificador, pabellon, piso }, asignacion: { id, codigoCurso, nombreCurso, codigoSeccion } }`.
  * 401 sin token, 403 si el rol no es `DOCENTE`, 404 si la cuenta no tiene un docente asociado.

### 2.3 Revisión y Resolución por Jefatura (#7.11)
* `GET /api/v1/admin/incidencias[?estado=&prioridad=&espacioId=]` (Issue 7.6)
  * Por defecto las `PENDIENTE`. Coordinación ve todas; Jefatura solo las de los laboratorios a su cargo (`EspacioResponsable`). Orden: mayor prioridad primero y, a igual prioridad, las más antiguas primero.
  * Cada incidencia: `{ id, identificadorSeguimiento, tipo, prioridad, estado, descripcion, evidencia, fechaReporte, comentarioCierre, fechaCierre, espacio, docente: { codigo, nombre }, asignacion: { id, codigoCurso, nombreCurso, codigoSeccion } }`.
* `GET /api/v1/admin/incidencias/:id/imagen` (Issue 7.19): la foto, con la misma regla de acceso que el listado (Jefatura solo las de sus laboratorios). Se responde con su `Content-Type`, `Content-Disposition: inline` y `X-Content-Type-Options: nosniff`. La ficha de la incidencia la muestra (se pide con el token, como `Blob`).
* `PATCH /api/v1/admin/incidencias/:id/resolver` (Issue 7.6)
  * Cuerpo: `{ estado: 'RESUELTA' | 'DESCARTADA', comentario }` (3 a 1000 caracteres). Guarda `comentario_cierre` y `fecha_cierre` (columnas nuevas de `Incidencia`, ver [`modelo-datos.md`](../modelo-datos.md) §4.15). 404 si no existe, 403 si Jefatura no es responsable del espacio, 409 si ya estaba cerrada.
  * La trazabilidad del cierre queda en esos dos campos; `RegistroAuditoria` no tiene referencia a incidencias.

---

## 3. Definition of Done (DoD)
- [ ] Interfaz limpia y responsiva para el docente.
- [ ] Trazabilidad completa de incidencias reportadas en auditoría.
- [ ] Cobertura de pruebas unitarias/integración $\ge 85\%$.
