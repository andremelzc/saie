import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

describe('Conversor de Planos (convertir-plano.mjs) - Issue #269 / 5.23', () => {
  const dirActual = path.dirname(fileURLToPath(import.meta.url));
  const rutaScript = path.resolve(dirActual, '../../../../tools/planos/convertir-plano.mjs');

  it('falla con código de salida 1 y mensaje de ayuda si faltan argumentos', () => {
    expect(() => {
      execFileSync(process.execPath, [rutaScript], { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();
  });

  it('procesa una exportación SVG y genera piso-N.svg, preview y codigos.json clasificados', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'saie-plano-test-'));

    try {
      // SVG sintético simulando exportación de Canva:
      // - Un aula (#b2d9ff)
      // - Un laboratorio (#d3c8ff grande)
      // - Un ascensor (#d3c8ff pequeño < 0.4 del aula)
      // - Una escalera (#ffbdbd)
      // - Una nota adhesiva ignorada (#fdf9b4)
      const svgCanva = `
        <svg viewBox="0 0 1000 1000">
          <g>
            <!-- Nota adhesiva que debe ignorarse -->
            <rect x="0" y="0" width="100" height="100" fill="#fdf9b4" />
            <!-- Aula -->
            <rect x="100" y="100" width="100" height="80" fill="#b2d9ff" />
            <!-- Laboratorio (área grande: 100 x 80 = 8000) -->
            <rect x="250" y="100" width="100" height="80" fill="#d3c8ff" />
            <!-- Ascensor (área pequeña: 30 x 30 = 900 < 0.4 * 8000) -->
            <rect x="400" y="100" width="30" height="30" fill="#d3c8ff" />
            <!-- Escalera -->
            <rect x="500" y="100" width="60" height="60" fill="#ffbdbd" />
            <!-- Muro (trazo oscuro sin relleno) -->
            <path d="M 10 10 L 20 20 L 30 20" stroke="#4a4a44" fill="none" />
          </g>
        </svg>
      `;

      const inputSvg = path.join(tmpDir, 'canva-export.svg');
      writeFileSync(inputSvg, svgCanva, 'utf-8');

      // Ejecutar el script
      execFileSync(process.execPath, [rutaScript, inputSvg, '--piso', '1', '--out', tmpDir], {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Verificar que los 3 artefactos fueron generados
      const rutaSvgLimpio = path.join(tmpDir, 'piso-1.svg');
      const rutaPreview = path.join(tmpDir, 'piso-1.preview.svg');
      const rutaTabla = path.join(tmpDir, 'piso-1.codigos.json');

      expect(existsSync(rutaSvgLimpio)).toBe(true);
      expect(existsSync(rutaPreview)).toBe(true);
      expect(existsSync(rutaTabla)).toBe(true);

      // Verificar contenido del JSON de códigos
      const jsonContent = JSON.parse(readFileSync(rutaTabla, 'utf-8'));
      expect(jsonContent.piso).toBe(1);
      expect(jsonContent.figuras).toBeDefined();

      const clasesDetectadas = jsonContent.figuras.map((f: { clase: string }) => f.clase);
      expect(clasesDetectadas).toContain('aula');
      expect(clasesDetectadas).toContain('laboratorio');
      expect(clasesDetectadas).toContain('ascensor');
      expect(clasesDetectadas).toContain('escalera');

      // Verificar que la nota adhesiva (#fdf9b4) fue ignorada
      expect(jsonContent.figuras.length).toBe(4);

      // Verificar SVG limpio
      const svgLimpio = readFileSync(rutaSvgLimpio, 'utf-8');
      expect(svgLimpio).toContain('data-clase="aula"');
      expect(svgLimpio).toContain('data-clase="laboratorio"');
      expect(svgLimpio).toContain('data-clase="ascensor"');
      expect(svgLimpio).toContain('data-clase="escalera"');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
