# Solicitud de Cambio — Avisos de cambio de aula por Telegram, bus de eventos y resumen diario

> **Borrador listo para registrarse como issue** con la plantilla `.github/solicitud-cambio.md` (título `[CAMBIO-LB] …`, label `cambio-lb`), según el [procedimiento de control de cambios](../04_plan_linea_base.md#5-procedimiento-de-control-de-cambios). **No se ha abierto el issue ni se ha modificado ningún documento de la línea base.**
> **Origen:** cobertura del sílabo de Automatización y Control de Software (ver [`registro-cobertura.md`](registro-cobertura.md) §3 y [`definiciones-e-implementacion.md`](definiciones-e-implementacion.md) §6).
> **Fecha:** 2026-10-08

## Estado de la línea base

Los documentos del alcance se declaran "congelados en la línea base funcional", pero **no existe ningún tag `lb-*`** (ni local ni en `origin`) y el acta `docs/acta-lb-funcional-01.md` tiene la verificación previa, la fecha y las decisiones del CCC sin completar. Es decir, la línea base funcional **todavía no se formalizó**.

Dos caminos válidos:

1. **Tratarla como congelada:** abrir esta solicitud, completar el análisis de impacto y que el CCC decida.
2. **Aplicar los cambios antes de formalizarla:** el procedimiento los permite sin solicitud mientras no haya tag, pero conviene que el CCC lo apruebe igualmente porque amplía el alcance.

---

## Elemento(s) afectado(s)

- `docs/03_alcance_y_reglas.md` v1.0.0 (LB-F)
- `docs/02_requisitos.md` v1.0.0 (LB-F)
- `docs/01_historias_usuario.md` v1.0.0 (LB-F)
- `docs/plan_maestro_pruebas.md` v1.1.0 (LB-F)
- `docs/arquitectura.md` (LB-D, aún sin versión formal)
- `docs/modelo-datos.md` y `backend/prisma/schema.prisma` (LB-D)

**Línea base:** ☒ Funcional ☒ Diseño ☐ Producto

## Cambio solicitado

Incorporar al alcance un canal de **avisos al estudiante por Telegram** y la infraestructura mínima que lo sostiene:

1. **Aviso de cambio de aula:** cuando una corrida de asignación cambia los espacios de una sección con asignación vigente, los alumnos matriculados que hayan vinculado Telegram reciben un mensaje con el curso, la sección, el aula anterior, el aula nueva y el horario.
2. **Vinculación voluntaria:** el alumno vincula su cuenta con el bot (código y clave de SAIE) y puede darse de baja.
3. **Resumen diario de clases:** mensaje a primera hora con las clases del día, disparado por una tarea programada.
4. **Bus de eventos interno:** el motor y la detección de alertas emiten eventos (`asignacion.cambiada`, `alerta.creada`) y los manejadores reaccionan. Un manejador registra la auditoría de alertas, hoy ausente.

### Texto propuesto por documento

**`docs/03_alcance_y_reglas.md`**

* §3.1 (dentro del MVP), nueva fila:

  | Funcionalidad | RF | Justificación |
  | :--- | :--- | :--- |
  | Avisos de cambio de aula y resumen diario por Telegram, con vinculación voluntaria | RF-25, RF-26, RF-27 | La asignación puede cambiar tras una nueva corrida; avisar evita que el estudiante llegue a un aula equivocada (dolor 04). |

* §3.2 (fuera del MVP), reemplazar la fila "Notificaciones por correo o push" por:

  | Exclusión | Justificación |
  | :--- | :--- |
  | **Notificaciones por correo, SMS o push móvil** | Cada canal agrega infraestructura (servidor de correo, proveedor de SMS, certificados push). Se incorpora únicamente Telegram (D-06), cuya API es gratuita. |

* §4, nueva decisión:

  | ID | Decisión | Alternativa descartada | Motivo |
  | :--- | :--- | :--- | :--- |
  | **D-06** | Los avisos al estudiante se envían solo por Telegram, con vinculación voluntaria mediante código y clave de SAIE. El sistema incorpora un bus de eventos interno y una tarea programada externa; no incorpora colas ni servicios de mensajería. | Correo electrónico (ya existe `correo` por alumno); SMS y WhatsApp (de pago). | La Bot API de Telegram es gratuita y el alumno participa una sola vez. El bus es del mismo proceso, proporcional al tamaño del sistema. |

**`docs/02_requisitos.md`**

| ID | Requisito | Actor | Prioridad |
| :--- | :--- | :---: | :---: |
| **RF-25** | El sistema debe permitir al alumno vincular su cuenta con el bot de Telegram identificándose con su código y su clave, y desvincularla en cualquier momento. | EST | S |
| **RF-26** | Cuando una corrida de asignación cambie los espacios de una sección con asignación vigente, el sistema debe avisar por Telegram a los matriculados con cuenta vinculada, indicando el aula anterior, la nueva y el horario. | SIS | S |
| **RF-27** | El sistema debe enviar cada día, a quienes lo tengan vinculado y tengan clase, un resumen con sus clases y aulas. | SIS | C |

| ID | Categoría | Requisito | Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-11** | Privacidad | Los mensajes de Telegram no incluyen datos de la ficha médica ni la condición de movilidad reducida; el envío es voluntario y revocable. | Pruebas unitarias del notificador |

**`docs/01_historias_usuario.md`**: HU-27 (vincular Telegram, RF-25) y HU-28 (recibir aviso de cambio de aula y resumen diario, RF-26 y RF-27), con criterios Dado/Cuando/Entonces, y su fila en la matriz RF → HU.

**`docs/arquitectura.md`**

* §2.2: aclarar que el principio *"automatización de decisión, no de infraestructura"* admite un bus de eventos interno y una tarea programada externa, sin listeners de infraestructura ni integraciones en tiempo real con sistemas institucionales.
* §3: agregar los componentes *Bus de eventos* y *Notificador de Telegram*.
* §4: agregar Telegram Bot API.
* §7: agregar a la tabla de triggers: *Cambio de asignación* (automático) y *Resumen diario* (programado).

**`docs/modelo-datos.md` y `schema.prisma`**: nueva tabla `VinculacionTelegram` (alumno, `chat_id`, activa, fecha de vinculación) y su migración.

## Motivo

* **Valor para el estudiante:** hoy el alumno solo se entera de un cambio de aula si vuelve a consultar. El aviso lo cierra.
* **Auditoría pendiente:** el tipo `ALERTA` de `TipoEventoAuditoria` existe pero no se registra (issue 5.11, abierto). Un manejador del bus lo resuelve sin acoplar el servicio de alertas a la auditoría.
* **Cobertura del sílabo:** sistemas orientados a eventos, programación orientada a eventos, temporizadores y bots de software son contenido de las semanas 4 y 7 del curso y no estaban aplicados.

## Alternativas consideradas

| Alternativa | Por qué no |
| :--- | :--- |
| No cambiar el alcance | Deja cuatro temas del sílabo sin aplicar. |
| Avisos por correo | Ya está excluido; no cubre el tema de bots y no es el canal que el estudiante revisa a diario. |
| Enviar por número de teléfono | Telegram no permite escribir a un número: el usuario debe iniciar la conversación con el bot. |
| Bus de eventos con un broker externo (Redis, RabbitMQ) | Desproporcionado para un backend de un solo proceso. |

## Análisis de impacto (lo completan LT y QA)

Estimación preliminar de quien redacta el borrador, **a validar**:

- **Otros documentos afectados:** los listados arriba; además `.md/01_definicion_y_alcance.md` §3 y §6 (borrador previo a la línea base).
- **Código afectado:** `backend/src/services/motor.service.ts` (emitir el evento tras confirmar la transacción), `alerta.service.ts` (emitir `alerta.creada`), módulos nuevos de bus de eventos y de Telegram, un endpoint protegido para el disparo programado, `schema.prisma` y una migración.
- **Pruebas afectadas:** pruebas nuevas del bus, del notificador (con la API de Telegram simulada), de la vinculación y del endpoint programado; ninguna prueba existente cambia de comportamiento.
- **Esfuerzo estimado:** se derivan ocho issues, de tamaño pequeño a mediano (bus de eventos, modelo de datos, vinculación, aviso de cambio de aula, resumen diario, pantalla de vinculación, pruebas y actualización de documentos). **Pendiente de estimar por LT y QA.**
- **Riesgo sobre el sprint en curso:** ☐ Bajo ☐ Medio ☐ Alto — **lo decide el CCC.** Nota: el riesgo operativo principal es el hosting gratuito (Render suspende el contenedor tras 15 minutos), que afecta al webhook de Telegram y obliga a disparar el resumen diario desde fuera.

## Decisión del CCC

| Rol | Voto | Comentario |
| :--- | :---: | :--- |
| Gestor/a de Configuración | | |
| Líder Técnico | | |
| QA | | |

**Resultado:** ☐ Aprobado ☐ Rechazado ☐ Diferido a Sprint __
