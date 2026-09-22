# Documento de Arquitectura del Sistema - SAIE

Este documento describe la arquitectura tecnológica del **Sistema de Apoyo a la Integración Escolar (SAIE)**.

---

## 1. Visión General
SAIE es una plataforma diseñada para gestionar y optimizar el proceso de integración escolar de estudiantes con necesidades específicas de apoyo educativo. El sistema integra portales para administradores, docentes, profesionales y familias, soportando validación de reglas pedagógicas, importación masiva de datos y seguimiento multidimensional.

---

## 2. Diagrama de Arquitectura de Alto Nivel

```
                 +-----------------------+
                 |    Clientes Web       |
                 | React + TS + Tailwind |
                 +-----------+-----------+
                             |
                      HTTPS / REST (Axios)
                             |
                             v
                 +-----------------------+
                 |    Backend API        |
                 | Express + TS + Zod    |
                 +-----------+-----------+
                             |
                        Prisma ORM
                             |
                             v
                 +-----------------------+
                 | PostgreSQL (Database) |
                 | Supabase (Cloud) /    |
                 | Docker (Local Dev)    |
                 +-----------------------+
```

---

## 3. Estructura del Proyecto
El proyecto está estructurado como un monorepo modular con responsabilidades claramente delimitadas:

- `/backend`: API REST, motor de reglas pedagógicas, importadores de datos y capa de acceso a datos con Prisma.
- `/frontend`: Aplicación web SPA (portales de acceso, paneles y visualizaciones) desarrollada con React y TailwindCSS.
- `/tests`: Suites de pruebas integrales (integración de API con Jest/Supertest, pruebas end-to-end con Playwright y pruebas de rendimiento con k6).
- `/docs`: Documentación técnica, guías de contribución, arquitectura y convenciones del equipo.
- `/assets/planos`: Recursos gráficos y diagramas vectoriales (SVG) de infraestructura y arquitectura.

---

## 4. Stack Tecnológico Acordado y Justificación

| Capa / Función | Tecnología Acordada | Justificación Técnica |
| :--- | :--- | :--- |
| **Backend Runtime** | **Node.js** (v24 LTS) | Alto rendimiento en operaciones I/O no bloqueantes, amplio soporte de librerías y compatibilidad total con TypeScript. |
| **Framework Backend** | **Express** con **TypeScript** | Framework minimalista, robusto y maduro que permite total flexibilidad arquitectónica. TypeScript aporta tipado estático, reduciendo drásticamente errores en tiempo de ejecución. |
| **ORM** | **Prisma** | Generador de tipos automatizado, migraciones seguras y tipado estricto en consultas sobre la base de datos PostgreSQL, acelerando el desarrollo sin sacrificar control. |
| **Validación de Datos** | **Zod** | Esquemas de validación estática y en tiempo de ejecución fuertemente integrados con TypeScript para requests, DTOs y variables de entorno. |
| **Base de Datos** | **PostgreSQL** (alojado en **Supabase** y contenedor local) | Motor relacional estándar de la industria con soporte nativo de transacciones ACID, tipos JSONB y escalabilidad. Supabase ofrece pooling de conexiones optimizado (PgBouncer). |
| **Frontend Framework** | **React** con **TypeScript** | Ecosistema reactivo líder para la construcción de interfaces de usuario modulares, con chequeo estático estricto. |
| **Estilos Frontend** | **TailwindCSS** | Enfoque utility-first para diseño rápido, consistente y altamente mantenible sin sobrecarga de CSS innecesario en producción. |
| **Enrutamiento Web** | **React Router** | Estándar para Single Page Applications (SPA), facilitando enrutamiento declarativo, protección de rutas por roles y carga perezosa. |
| **Cliente HTTP** | **Axios** | Cliente HTTP basado en promesas con soporte integrado de interceptores para tokens JWT y manejo uniforme de respuestas/errores. |
| **Pruebas Unitarias/Integración** | **Jest** con **ts-jest** & **Supertest** | Suite estándar para pruebas unitarias y pruebas de integración de endpoints HTTP sin necesidad de levantar el servidor en red externa. |
| **Pruebas E2E** | **Playwright** | Automatización moderna de pruebas en navegadores reales (Chromium, Firefox, WebKit) con ejecución paralela rápida y reportes visuales. |
| **Pruebas de Carga** | **k6** | Herramienta de pruebas de carga y estrés orientada a desarrolladores, escrita en JavaScript y ejecutada sobre un motor Go de alto rendimiento. |
| **Integración Continua (CI)** | **GitHub Actions** | Automatización nativa en GitHub para pipelines de compilación, verificación de linters y ejecución de suites de pruebas automáticas. |
| **Calidad de Código** | **SonarCloud** | Análisis estático continuo de código (SAST), detección de code smells, vulnerabilidades de seguridad y métricas de cobertura. |
| **Despliegue Frontend** | **Vercel** | Plataforma optimizada para despliegue de Single Page Applications con CDN global, previsualizaciones automáticas por PR y despliegue continuo. |
| **Despliegue Backend** | **Render** | Servicio en la nube administrado para servicios Node.js en contenedores con soporte de variables de entorno y escalado sencillo. |

---

## 5. Entornos y Configuración
- **Desarrollo Local**: Base de datos PostgreSQL instanciada vía `docker-compose.yml` (`saie_dev`) y servidor backend en modo recarga rápida (`tsx`).
- **Producción**: PostgreSQL gestionado en Supabase mediante Transaction Pooler y conexión directa para migraciones de Prisma.
