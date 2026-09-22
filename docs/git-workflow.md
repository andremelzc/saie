# Convenciones de Commits y Estrategia de Branching - SAIE

Para garantizar un historial limpio, trazabilidad y consistencia entre todos los miembros del equipo durante todos los sprints, se adoptan las siguientes directrices obligatorias.

---

## 1. Estrategia de Ramas (Branching Strategy)

Se utiliza una adaptación de **GitHub Flow / Feature Branching** basada en roles y trazabilidad por issues:

```
main (Producción estable)
  ^
  | PR revisado y aprobado
develop (Integración del Sprint actual)
  ^
  |
  +-- feature/ISSUE-ID-descripcion-corta
  +-- bugfix/ISSUE-ID-descripcion-corta
  +-- hotfix/descripcion-urgente (hacia main y develop)
```

### Nomenclatura de Ramas
- `feature/<id-issue>-<breve-descripcion>`: Nuevas funcionalidades o requerimientos (ej: `feature/1.02-auth-jwt`).
- `bugfix/<id-issue>-<breve-descripcion>`: Corrección de errores en ramas de integración (ej: `bugfix/2.05-fix-csv-import`).
- `hotfix/<breve-descripcion>`: Correcciones críticas directas hacia producción.
- `chore/<id-issue>-<breve-descripcion>`: Mantenimiento de configuración, dependencias o tooling (ej: `chore/0.01-setup-eslint`).

---

## 2. Convenciones de Commits (Conventional Commits)

Cada commit debe seguir el estándar de [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

```
<tipo>(<ámbito opcional>): <descripción concisa en imperativo y presente>

[cuerpo explicativo opcional]

[pie de página con referencias a issues opcional]
```

### Tipos Permitidos
- `feat`: Añade una nueva funcionalidad para el usuario o sistema.
- `fix`: Corrige un error o bug en el código.
- `docs`: Modificaciones únicamente en documentación (README, Markdown en /docs).
- `style`: Cambios de formato (espacios en blanco, formato con prettier, comas) que no alteran la lógica.
- `refactor`: Refactorización de código existente sin añadir características ni solucionar errores.
- `perf`: Mejoras de rendimiento en consultas o procesamiento.
- `test`: Incorporación o corrección de pruebas automatizadas (Jest, Playwright, k6).
- `build`: Cambios que afectan el sistema de compilación o dependencias externas (npm, vite, prisma).
- `ci`: Modificaciones en pipelines de CI/CD (GitHub Actions, SonarCloud).
- `chore`: Tareas auxiliares de configuración que no modifican código de producción ni tests.

### Ejemplos
```bash
feat(backend): agregar endpoint de autenticacion con jwt
fix(frontend): resolver redireccion fallida en panel de docentes
docs(readme): actualizar instrucciones de conexion a postgres local
test(api): anadir prueba de integracion supertest para health check
chore(deps): actualizar dependencias base de typescript
```

---

## 3. Política de Pull Requests (PR) y Code Review

1. Ningún commit se realiza de forma directa en `main` o `develop`.
2. Todo Pull Request debe:
   - Contar con al menos una aprobación de un revisor del equipo.
   - Pasar los checks automáticos de compilación, linters y pruebas unitarias.
   - Tener la descripción del cambio y vincular el issue correspondiente (`Closes #ID`).
3. Para mantener el historial lineal y legible, se prefiere la estrategia **Squash and merge** o **Rebase and merge**.
