const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  mkdirSync(path.resolve('tmp'), { recursive: true });
  const base = process.env.PREVIEW_URL || 'http://127.0.0.1:6756';
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><title>Quarto frame check</title><body style="margin:0">
      <iframe id="preview" title="Website" src="${base}/research.html"
      sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-downloads"
      style="width:100vw;height:100vh;border:0"></iframe>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/`, { timeout: 60000 });
    await page.locator('.suit-portrait img').waitFor();
    assert.equal(await page.locator('.suit-portrait img').getAttribute('src'), 'pictures/portrait_suit_original.jpeg');
    await page.locator('.suit-portrait img').evaluate(image => image.decode());
    const portraitSizes = [];
    for (const [width, height] of [[320, 740], [390, 844], [768, 1000], [900, 700],
      [901, 1000], [1100, 900], [1440, 600], [1440, 1000], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      const dimensions = await page.locator('.suit-portrait img').evaluate(image => {
        const frame = image.closest('.hero-visual').getBoundingClientRect();
        const box = image.getBoundingClientRect();
        const ratio = image.naturalWidth / image.naturalHeight;
        const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
        return {
          width: frame.width, height: frame.height,
          horizontalBars: box.width - image.naturalWidth * scale,
          verticalBars: box.height - image.naturalHeight * scale,
          ratioError: Math.abs(frame.width - frame.height * ratio),
          fitsFrame: Math.abs(frame.left - box.left) < 1 && Math.abs(frame.top - box.top) < 1 &&
            Math.abs(frame.width - box.width) < 1 && Math.abs(frame.height - box.height) < 1,
          fit: getComputedStyle(image).objectFit,
          transform: getComputedStyle(image).transform,
          overflow: document.documentElement.scrollWidth > innerWidth + 1
        };
      });
      assert.ok(dimensions.ratioError < 1, `Wrong frame ratio at ${width}x${height}: ${JSON.stringify(dimensions)}`);
      assert.ok(dimensions.horizontalBars < 1 && dimensions.verticalBars < 1,
        `Portrait bars at ${width}x${height}: ${JSON.stringify(dimensions)}`);
      assert.ok(dimensions.fitsFrame && !dimensions.overflow);
      assert.equal(dimensions.fit, 'contain');
      assert.equal(dimensions.transform, 'none');
      portraitSizes.push(`${width}x${height}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve('tmp/home-suit-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.hero-visual').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.resolve('tmp/home-suit-mobile.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { timeout: 60000 });
    const site = page.frameLocator('#preview');
    await site.locator('a[href$="papers/Lamproye_JMP.pdf"]').click();
    await site.getByRole('dialog', { name: 'Job Market Paper PDF' }).waitFor();
    const pdf = await (await site.locator('iframe').elementHandle()).contentFrame();
    await pdf.waitForFunction(() => window.PDFViewerApplication?.pdfDocument?.numPages > 0,
      null, { timeout: 60000 });
    const pages = await pdf.evaluate(() => window.PDFViewerApplication.pdfDocument.numPages);
    await pdf.waitForFunction(() => document.querySelector('.page[data-page-number="1"] canvas')?.width > 0);
    await page.screenshot({ path: path.resolve('tmp/jmp-in-preview.png') });
    await site.getByRole('button', { name: 'Back to website' }).click();
    assert.equal(await site.getByRole('dialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', suitPhoto: true, mobileOverflow: false,
      portraitWithoutBars: portraitSizes, jmpPages: pages, jmpInPane: true, errors }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
