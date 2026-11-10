// Run with the supported Playwright runtime; no browser profile is reused.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  mkdirSync(path.resolve('tmp'), { recursive: true });
  const base = process.env.PREVIEW_URL || 'http://127.0.0.1:6756';
  const origin = new URL(base).origin;
  const errors = [];
  const fixture = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html><html><head><title>Embedded preview test</title></head>
      <body style="margin:0"><iframe title="Quarto preview" id="preview"
      sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-downloads"
      style="width:100vw;height:100vh;border:0" src="${origin}/cv.html"></iframe></body></html>`);
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/preview/') && response.status() >= 400) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto(`http://127.0.0.1:${fixture.address().port}`, { waitUntil: 'load', timeout: 60000 });
    const content = page.frameLocator('#preview');
    await content.getByRole('link', { name: 'download my full CV as a PDF' }).click();
    await content.getByRole('dialog', { name: 'Curriculum Vitae PDF' }).waitFor();
    const viewerFrame = await (await content.locator('iframe').elementHandle()).contentFrame();
    await viewerFrame.waitForFunction(() => window.PDFViewerApplication?.pdfDocument?.numPages === 3,
      null, { timeout: 45000 });
    await viewerFrame.waitForFunction(() => document.querySelector('.page[data-page-number="1"] canvas')?.width > 0);
    await viewerFrame.locator('.page[data-page-number="1"] .textLayer').waitFor();
    const report = await viewerFrame.evaluate(async () => {
      const app = window.PDFViewerApplication;
      const textByPage = [];
      for (let n = 1; n <= app.pdfDocument.numPages; n++) {
        const page = await app.pdfDocument.getPage(n);
        const text = await page.getTextContent();
        textByPage.push(text.items.map(item => item.str).join(' '));
      }
      return { pages: app.pdfDocument.numPages, textByPage, source: app.url };
    });
    assert.equal(report.pages, 3);
    assert.ok(report.textByPage.every(text => text.length > 100));
    assert.match(report.textByPage[0], /Lamproye/);
    // Selectable text and normal navigation, not just a raster screenshot.
    await viewerFrame.evaluate(() => {
      const span = document.querySelector('.page[data-page-number="1"] .textLayer span');
      const range = document.createRange();
      range.selectNodeContents(span);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    });
    assert.ok(await viewerFrame.evaluate(() => getSelection().toString().length > 0));
    await page.screenshot({ path: path.resolve('tmp/pdf-preview-verified.png') });
    for (const n of [2, 3]) {
      await viewerFrame.evaluate(n => { window.PDFViewerApplication.page = n; }, n);
      await viewerFrame.waitForFunction(n =>
        document.querySelector(`.page[data-page-number="${n}"] canvas`)?.width > 0, n);
    }
    await content.getByRole('button', { name: 'Back to website' }).click();
    assert.equal(await content.getByRole('dialog').count(), 0);
    assert.match(await content.locator('a:focus').getAttribute('href'), /files\/Lamproye_CV\.pdf$/);
    await content.getByRole('link', { name: 'download my full CV as a PDF' }).click();
    await content.getByRole('dialog').waitFor();
    await content.getByRole('button', { name: 'Back to website' }).click();
    // Outside a frame the original PDF URL is untouched and no reader is injected.
    const plain = await browser.newPage();
    await plain.goto(`${origin}/cv.html`);
    const originalHref = await plain.getByRole('link', { name: 'download my full CV as a PDF' }).getAttribute('href');
    assert.equal(new URL(originalHref, `${origin}/cv.html`).href, `${origin}/files/Lamproye_CV.pdf`);
    assert.equal(await plain.getByRole('dialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', pages: report.pages,
      pageTextLengths: report.textByPage.map(text => text.length),
      source: report.source, selectableText: true, backAndReopen: true, errors }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => fixture.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
