import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComoCoordinacion, simularPanel } from './helpers-panel';

test('diagnostico axe', async ({ page }) => {
  await simularPanel(page);
  await entrarComoCoordinacion(page);

  for (const ruta of ['/admin/espacios', '/admin/alertas', '/admin']) {
    await page.goto(ruta);
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    // eslint-disable-next-line no-console
    console.log(`\n### ${ruta}`);
    r.violations.forEach((v) => {
      // eslint-disable-next-line no-console
      console.log(`  ${v.impact} ${v.id}: ${v.help}`);
      v.nodes.forEach((n) => {
        // eslint-disable-next-line no-console
        console.log(`     target=${JSON.stringify(n.target)} html=${n.html.slice(0, 160)}`);
        // eslint-disable-next-line no-console
        console.log(`     msg=${n.any.map((a) => a.message).join(' | ')}`);
      });
    });
  }
});
