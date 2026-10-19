# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

## Panel administrativo (Sprint 3)

| Ruta                 | Pantalla                                                      | Roles                  | Issue      |
| -------------------- | ------------------------------------------------------------- | ---------------------- | ---------- |
| `/admin`             | Inicio (Coordinación: corrida + escaladas; Jefatura: resumen) | Coordinación, Jefatura | 4.20       |
| `/admin/alertas`     | Centro de alertas (`TarjetaAlerta`)                           | Coordinación, Jefatura | 4.9 / 4.10 |
| `/admin/carga`       | Carga de datos maestros (3 flujos)                            | Coordinación           | 1.9        |
| `/admin/espacios`    | Listado de espacios                                           | Coordinación, Jefatura | 4.15       |
| `/admin/laboratorio` | Cambio de software / PCs                                      | Coordinación, Jefatura | 4.19       |

**Decisión de navegación (4.20):** el inicio de Coordinación usa la misma barra de pestañas
(Inicio/Espacios/Alertas/Carga) que el resto del panel, por consistencia; abajo en móvil y
arriba en escritorio. Pendiente de validar con el equipo.

**4.19:** los campos se tomaron de los endpoints 4.1 y 4.2 porque el Figma (`37:4874`) aún
tiene texto placeholder; confirmar con diseño.
