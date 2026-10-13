import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = process.env.TEST_OUTPUT_DIR || '/tmp/ach-verification';
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { ready = (await fetch('http://127.0.0.1:3000/api/health')).ok; if (ready) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Local server did not start');
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3000');
  await page.screenshot({ path: `${output}/home.png` });
  const navigate = name => page.getByRole('button', { name, exact: true }).click();
  async function download(name, buttonName, expectedWidth, expectedHeight) {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }),
      page.getByRole('button', { name: buttonName, exact: true }).click()]).catch(async error => {
      console.error('EXPORT STATE', await page.locator('body').innerText());
      await page.screenshot({ path: `${output}/${name}-error.png`, fullPage: true });
      throw error;
    });
    const path = `${output}/${name}.png`;
    await file.saveAs(path);
    const bytes = await readFile(path);
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    if (expectedWidth) assert.equal(bytes.readUInt32BE(16), expectedWidth);
    if (expectedHeight) assert.equal(bytes.readUInt32BE(20), expectedHeight);
    return bytes;
  }
  await navigate('Portadas');
  for (const format of ['carta', 'oficio']) {
    await check(`cover ${format}: downloadable PNG and exact page dimensions`, async () => {
      await page.getByRole('combobox', { name: 'Tamaño de hoja' }).selectOption(format);
      await download(`cover-${format}`, 'Descargar PNG', 2550, format === 'carta' ? 3300 : 3900);
    });
  }
  await check('loaded photos export without refetching or relying on Image.decode', async () => {
    await page.locator('[data-export-surface] img').evaluate(image => {
      if (!image.complete || !image.naturalWidth) throw new Error('Test image is not loaded');
    });
    await page.evaluate(() => {
      window.savedImageFetch = window.fetch;
      window.savedImageDecode = HTMLImageElement.prototype.decode;
      window.imageFetchCount = 0;
      window.fetch = (...args) => {
        if (String(args[0]).includes('/images/')) {
          window.imageFetchCount++;
          return Promise.reject(new Error('Image refetch blocked in regression test'));
        }
        return window.savedImageFetch(...args);
      };
      HTMLImageElement.prototype.decode = () => Promise.reject(new Error('WebKit decode rejection'));
    });
    try {
      await download('cover-cached-image', 'Descargar PNG', 2550, 3900);
      assert.equal(await page.evaluate(() => window.imageFetchCount), 0);
    } finally {
      await page.evaluate(() => {
        window.fetch = window.savedImageFetch;
        HTMLImageElement.prototype.decode = window.savedImageDecode;
      });
    }
  });
  await check('cover editorial template', async () => {
    await page.getByRole('button', { name: /2. Guía Editorial/ }).click();
    await download('cover-editorial', 'Descargar PNG', 2550, 3900);
  });
  await check('cover copying writes an image to clipboard', async () => {
    await page.getByRole('button', { name: 'Copiar Portada como Imagen', exact: true }).click();
    await page.getByRole('button', { name: /Portada Copiada/ }).waitFor();
    assert(await page.evaluate(async () => (await navigator.clipboard.read()).some(item => item.types.includes('image/png'))));
  });
  await check('cover-to-credits transfers page format and logos', async () => {
    await page.getByRole('button', { name: 'Generar Hoja de Créditos', exact: true }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Tamaño de hoja' }).inputValue(), 'oficio');
    assert(await page.locator('[data-export-surface]').getByRole('img', { name: 'Fondo Humanitario para Guatemala' }).isVisible());
  });
  for (const format of ['carta', 'oficio']) {
    await check(`credits ${format}: downloadable PNG with attribution`, async () => {
      await page.getByRole('combobox', { name: 'Tamaño de hoja' }).selectOption(format);
      assert((await page.locator('[data-export-surface]').innerText()).includes('El contenido de este material'));
      await download(`credits-${format}`, 'Descargar PNG', 2550, format === 'carta' ? 3300 : 3900);
    });
  }
  await navigate('Gráficas');
  await check('chart export includes title on a white background', async () => {
    const bytes = await download('chart', /Descargar/ );
    assert(bytes.length > 10000);
  });
  await navigate('Tablas');
  await check('editable table and Word/Excel HTML clipboard', async () => {
    const title = page.getByPlaceholder('Título de la tabla...');
    await title.fill('Prueba de exportación ACH');
    await page.getByRole('button', { name: 'Copiar para Word', exact: true }).click();
    await page.getByRole('button', { name: '¡Copiado para Word!', exact: true }).waitFor();
    const html = await page.evaluate(async () => { const items = await navigator.clipboard.read(); return await (await items[0].getType('text/html')).text(); });
    assert(html.includes('Prueba de exportación ACH'));
    assert(html.includes('<table'));
    await page.getByRole('button', { name: 'Copiar para Excel', exact: true }).click();
    await page.getByRole('button', { name: '¡Copiado para Excel!', exact: true }).waitFor();
    assert(await page.evaluate(async () => (await navigator.clipboard.read()).some(item => item.types.includes('text/html'))));
  });
  await check('API local CSV parsing preserves quoted commas and avoids fabricated rows', async () => {
    const response = await fetch('http://127.0.0.1:3000/api/extract-table', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Municipio,Familias\n"Ipala, Chiquimula",120\nJocotán,85' }) });
    const json = await response.json();
    assert.equal(json.data.rows[0][0].value, 'Ipala, Chiquimula');
    assert.equal(json.data.rows.length, 2);
    const invalid = await fetch('http://127.0.0.1:3000/api/extract-table', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Sin datos tabulares' }) });
    assert.equal(invalid.status, 422);
  });
  await check('cover assistant uses supplied topic without inventing metadata', async () => {
    const response = await fetch('http://127.0.0.1:3000/api/ai/cover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: 'Reservorios de agua de lluvia', documentType: 'INFORME TÉCNICO' }) });
    const json = await response.json();
    assert.equal(json.data.title, 'RESERVORIOS DE AGUA DE LLUVIA');
    assert.equal(json.data.projectCode, undefined);
    assert.equal(json.data.authorName, undefined);
  });
  await check('mobile previews show complete Carta and Oficio layouts without cropping', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate('Portadas');
    await page.getByRole('button', { name: /1. Informe de Monitoreo/ }).click();
    for (const format of ['carta', 'oficio']) {
      await page.getByRole('combobox', { name: 'Tamaño de hoja' }).selectOption(format);
      const layout = await page.locator('[data-export-surface]').evaluate(element => {
        const page = element.getBoundingClientRect();
        const author = element.querySelector('[data-page-author]').getBoundingClientRect();
        const frame = element.closest('[data-page-preview]').getBoundingClientRect();
        return { page: { width: page.width, height: page.height, bottom: page.bottom }, author: { height: author.height, bottom: author.bottom }, frame: { width: frame.width, height: frame.height }, scroll: element.scrollHeight, height: element.clientHeight };
      });
      assert(Math.abs(layout.page.width / layout.page.height - 8.5 / (format === 'carta' ? 11 : 13)) < 0.001);
      assert(Math.abs(layout.frame.height - layout.page.height) < 1);
      assert(layout.author.bottom <= layout.page.bottom + 1, 'Author band is cropped');
      assert(layout.author.height > 20, 'Author band disappeared');
      assert(layout.scroll <= layout.height + 1, 'Document content exceeds the page');
      await download(`cover-mobile-${format}`, 'Descargar PNG', 2550, format === 'carta' ? 3300 : 3900);
      await page.locator('[data-page-preview]').screenshot({ path: `${output}/preview-mobile-${format}.png` });
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
  });
  await check('editorial and credits previews retain the selected page ratio on mobile', async () => {
    await page.getByRole('button', { name: /2. Guía Editorial/ }).click();
    for (const format of ['carta', 'oficio']) {
      await page.getByRole('combobox', { name: 'Tamaño de hoja' }).selectOption(format);
      await download(`editorial-mobile-${format}`, 'Descargar PNG', 2550, format === 'carta' ? 3300 : 3900);
    }
    await navigate('Créditos');
    for (const format of ['carta', 'oficio']) {
      await page.getByRole('combobox', { name: 'Tamaño de hoja' }).selectOption(format);
      const box = await page.locator('[data-export-surface]').boundingBox();
      assert(Math.abs(box.width / box.height - 8.5 / (format === 'carta' ? 11 : 13)) < 0.001);
      await download(`credits-mobile-${format}`, 'Descargar PNG', 2550, format === 'carta' ? 3300 : 3900);
    }
  });
  await check('no unhandled client errors', async () => assert.deepEqual(errors, []));
} finally {
  if (browser) await browser.close();
  server.kill();
}
assert.deepEqual(failures, [], `Failed checks: ${failures.join(', ')}`);
