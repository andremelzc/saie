# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

SAIE es el sistema de la Facultad de Ingeniería de Sistemas e Informática (UNMSM, Escuela de Ingeniería de Software, Grupo 6, 2026). Cuatro roles (`Cuenta.rol`):

- **Estudiante (`ALUMNO`):** quiere saber dónde le toca clase, sin depender de PDFs ni de grupos informales. Es el usuario más numeroso y el que ve el portal público de consulta. Lo usa sobre todo **en el celular**, a menudo entre clases y con prisa (la próxima clase, el aula, cómo llegar), y también en computadora, así que la pantalla de escritorio tiene que verse igual de bien.
- **Docente (`DOCENTE`):** quiere su grupo en un solo bloque, con el software listo y cerca de sus secciones paralelas.
- **Coordinación Académica (`COORDINACION_ACADEMICA`):** carga la programación y necesita una asignación válida sin armarla a mano; revisa las secciones que el motor escala.
- **Jefatura de Laboratorios (`JEFATURA_LABORATORIOS`):** mantiene al día el estado de los laboratorios y debe enterarse cuando un cambio afecta clases ya asignadas.

## Product Purpose

Asignar de forma inteligente y óptima los espacios académicos (aulas teóricas y laboratorios) y mostrárselos a quien los necesita. El éxito es que un estudiante encuentre su aula sin preguntar a nadie, que Coordinación obtenga una asignación válida sin trabajo manual y que Jefatura se entere a tiempo de lo que afecta a sus laboratorios.

## Positioning

La asignación no es una hoja de cálculo: el motor combina capacidad real, compatibilidad de software, contigüidad física entre secciones paralelas y prioridad de accesibilidad para estudiantes con movilidad reducida. Se apoya en los planos reales de la facultad (tres pisos, dos pabellones unidos por un patio), con los que dibuja el mapa de ocupación y las rutas.

## Operating Context

- Los datos entran por importación masiva de CSV (guía en `docs/guia-csv.md`); el periodo vigente se toma de `PERIODO_VIGENTE` o del más reciente.
- La facultad tiene **una sola entrada desde la calle**, en el pabellón antiguo. Los pabellones antiguo y nuevo se comunican por el patio de la planta baja (puertas al patio) y también por pasadizos interiores. Los pisos se recorren por escaleras (de dos tramos con descanso) y ascensores.
- El plano no tiene escala en metros y no se va a tener: las distancias solo sirven para comparar y el recorrido es de referencia.
- Despliegue: frontend en Vercel y backend en Render; base de datos PostgreSQL (Supabase).

## Capabilities and Constraints

- **Distinción obligatoria:** las aulas teóricas no tienen PCs (capacidad real = aforo nominal); los laboratorios tienen PCs malogradas y matriz de software.
- La ficha médica nunca se expone en la consulta pública (RNF-09).
- Cada pantalla muestra solo lo que su rol puede ver; las rutas se calculan con ascensor cuando hay movilidad reducida.
- Una sección escalada se muestra como «pendiente», nunca con un aula incorrecta.
- Terminología: espacio, aula teórica, laboratorio, sección, corrida (una ejecución del motor), escalada (a revisión de Coordinación), pabellón antiguo / nuevo.
- Sin decidir: el color que sustituye al índigo en la ruta y la maqueta 3D (ver Brand Commitments).

## Brand Commitments

- La guía `docs/07_guia_de_estilos_ui_ux.md` es **vinculante**: guinda institucional (`#7B1113`) como firma, lienzo crema (`#FAF6ED`), serif editorial solo para marca y títulos mayores, sans-serif para el resto. Los colores de estado (verde, amarillo lima, naranja, rojo) se reservan para ocupación, alertas y prioridades.
- El **índigo no forma parte de la paleta** y no debe usarse; hoy aparece en la ruta y en la maqueta 3D y está por reemplazarse.
- Los tokens `saie-*` viven en `frontend/src/index.css`; un color nuevo se agrega a la guía y a los tokens antes de usarse.

## Evidence on Hand

- Planos reales de los tres pisos en `assets/planos/` (fuentes en `tools/planos/fuentes/`).
- Documentación: `docs/` (historias de usuario, requisitos, alcance, arquitectura, modelo de datos, guía de estilos, auditorías de UI/UX) y `docs/specs/`.
- No hay testimonios, cifras de uso reales ni métricas de adopción; no inventarlos.

## Product Principles

1. **Una prioridad por pantalla:** cada vista dice una cosa primero (la próxima clase, el aula, el estado del laboratorio) y todo lo demás queda detrás.
2. **El celular manda, el escritorio no se descuida:** se diseña para el pulgar y la prisa, y se comprueba que la computadora aproveche el espacio sin reorganizarse al azar.
3. **Nunca afirmar lo que no se sabe:** mientras carga, no se dice «no tienes clases»; una sección escalada no muestra un aula falsa; el recorrido es de referencia y lo dice.
4. **Accesibilidad como parte del producto, no un añadido:** movilidad reducida, texto grande, movimiento reducido y color que nunca es el único portador de significado.
5. **Una sola manera de hacer cada cosa:** controles, estados y colores salen de los mismos componentes y tokens en los cuatro portales.

## Accessibility & Inclusion

- WCAG 2.1 AA como mínimo: contraste de texto, bordes de campos (3:1) y foco visible.
- Áreas táctiles de al menos 44×44 px y texto de al menos 14 px.
- Ajustes del estudiante: texto grande y reducción de animaciones.
- Priorización de estudiantes con movilidad reducida en la asignación y en la ruta (ascensor).
- Se decidió no verificar con NVDA o VoiceOver el foco al `h1` al cambiar de ruta (Issue 3.45 / #357).
