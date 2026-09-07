import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const svg = readFileSync('logo-final.svg');
const b64 = `data:image/svg+xml;base64,${svg.toString('base64')}`;
const sizes = [16, 32, 48, 128, 256, 2000];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 2000, height: 2000 }, deviceScaleFactor: 1 });
for (const n of sizes) {
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img src="${b64}" width="${n}" height="${n}" style="display:block"></body></html>`
  );
  await page.screenshot({ path: `icon-${n}.png`, clip: { x: 0, y: 0, width: n, height: n }, omitBackground: true });
  console.log(`icon-${n}.png`);
}
await browser.close();
