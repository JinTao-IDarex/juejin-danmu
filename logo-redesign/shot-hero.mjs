import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
for (let i = 1; i <= 3; i++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.goto(`file:///D:/2workspace/codex/juejin3/logo-redesign/direction-${i}.html`);
  await page.waitForTimeout(300);
  const best = await page.evaluate(() => {
    let bestEl = null, bestArea = 0;
    for (const svg of document.querySelectorAll('svg')) {
      const r = svg.getBoundingClientRect();
      const style = getComputedStyle(svg);
      if (style.display === 'none' || style.visibility === 'hidden' || r.width < 50) continue;
      const area = r.width * r.height;
      if (area > bestArea) { bestArea = area; bestEl = svg; }
    }
    if (bestEl) bestEl.setAttribute('data-hero-shot', '1');
    return bestArea;
  });
  const el = page.locator('svg[data-hero-shot="1"]');
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `hero-${i}.png`, animations: 'disabled' });
  
  await page.close();
}
await browser.close();
