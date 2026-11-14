import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './design-browser.mjs';

const base = process.env.TEST_BASE_URL || 'http://localhost:5000';
const output = '.temp/design/final';
await mkdir(output, { recursive: true });
const results = [];
const recordings = [];
const browserErrors = [];
async function visit(browser, path = '', settle = 800) {
  await browser.navigate(base + path, settle);
  await browser.until("document.documentElement.dataset.appReady === 'true'");
}
const desktop = await openBrowser();
try {
  await visit(desktop, '', 1400);
  await desktop.until(
    "document.querySelector('.ym-hero-title img')?.complete && document.querySelector('.ym-hero-image')?.naturalWidth > 0"
  );
  const stop = await desktop.record(output + '/desktop-frames');
  await desktop.screenshot(output + '/desktop-home.png');
  const geometry = await desktop.evaluate(
    `({nav:document.querySelector('.ym-desktop-nav').getBoundingClientRect().toJSON(),hero:document.querySelector('.ym-hero').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth})`
  );
  assert.equal(geometry.hero.height, 790);
  assert.ok(Math.abs(geometry.nav.width - 517.3125) < 3);
  assert.equal(geometry.overflow, false);
  const first = await desktop.evaluate(
    "document.querySelector('.ym-hero-title').textContent + document.querySelector('.ym-hero-title img')?.alt"
  );
  await desktop.delay(8300);
  const next = await desktop.evaluate(
    "document.querySelector('.ym-hero-title').textContent + document.querySelector('.ym-hero-title img')?.alt"
  );
  assert.notEqual(first, next, 'the hero advances automatically');
  await desktop.delay(800);
  await desktop.screenshot(output + '/desktop-hero-next.png');
  await desktop.click('.hero-pause');
  await desktop.until(
    "document.querySelector('.hero-pause').getAttribute('aria-pressed')==='true'"
  );
  await desktop.click('.ym-hero-dots > button', 0);
  await desktop.until(
    "document.querySelector('.ym-hero-dots > button').getAttribute('aria-pressed')==='true'"
  );
  assert.equal(
    await desktop.evaluate(
      "document.querySelector('.ym-hero-dots > button').getAttribute('aria-pressed')"
    ),
    'true'
  );
  await desktop.click('.hero-split-button button');
  await desktop.until(
    "document.querySelector('.hero-split-button button').getAttribute('aria-pressed')==='true'"
  );
  assert.equal(
    await desktop.evaluate(
      "JSON.parse(localStorage.getItem('ymovies:preferences:guest')).watchlist.length"
    ),
    1
  );
  await desktop.click('.hero-split-button button');
  results.push({
    check: 'desktop hero geometry, timer, dots, and saved list',
    geometry
  });

  await desktop.evaluate(
    "document.querySelector('.ym-row:not(.ranked) .ym-card').scrollIntoView({block:'center',behavior:'smooth'})"
  );
  await desktop.delay(850);
  assert.equal(
    await desktop.evaluate(
      "document.querySelector('.ym-navigation').classList.contains('condensed')"
    ),
    true
  );
  assert.equal(
    await desktop.evaluate(
      "document.querySelector('.ym-row:not(.ranked) .media-rail').scrollLeft"
    ),
    0
  );
  await desktop.hover('.ym-row:not(.ranked) .ym-card');
  await desktop.until(
    "document.querySelector('.card-preview')?.parentElement === document.body"
  );
  await desktop.delay(550);
  await desktop.screenshot(output + '/desktop-hover.png');
  await desktop.click('.card-preview .preview-actions button');
  await desktop.until(
    "document.querySelector('.card-preview .preview-actions button')?.getAttribute('aria-pressed')==='true'"
  );
  await desktop.click('.card-preview .preview-actions button');
  await desktop.call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 1,
    y: 1
  });
  await desktop.until("!document.querySelector('.card-preview')");
  const railBefore = await desktop.evaluate(
    "document.querySelector('.ym-row:not(.ranked) .media-rail').scrollLeft"
  );
  await desktop.click('.ym-row:not(.ranked) .rail-arrow.right');
  await desktop.delay(700);
  assert.ok(
    (await desktop.evaluate(
      "document.querySelector('.ym-row:not(.ranked) .media-rail').scrollLeft"
    )) > railBefore
  );
  results.push({
    check:
      'desktop hover preview remains usable, row gutter, arrows, condensed navigation'
  });

  await desktop.evaluate(
    "document.querySelector('.provider-picks').scrollIntoView({block:'start',behavior:'smooth'})"
  );
  await desktop.until("document.querySelector('.provider-picks .ym-card')");
  const netflix = await desktop.evaluate(
    "document.querySelector('.provider-picks .poster').getAttribute('href')"
  );
  await desktop.evaluate(
    "(()=>{const s=document.querySelector('.provider-picks select');s.value='337';s.dispatchEvent(new Event('change',{bubbles:true}))})()"
  );
  await desktop.until(
    `document.querySelector('.provider-picks .poster')?.getAttribute('href')!==${JSON.stringify(netflix)}`
  );
  await desktop.delay(500);
  await desktop.screenshot(output + '/desktop-provider.png');
  results.push({ check: 'provider selector fetches a different catalog' });

  await desktop.evaluate('window.scrollTo(0,0)');
  await desktop.delay(300);
  await desktop.click('.ym-desktop-nav button[aria-label="Settings"]');
  await desktop.until("document.querySelector('.ym-account-menu')");
  await desktop.screenshot(output + '/desktop-menu.png');
  await desktop.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape'
  });
  await desktop.until("!document.querySelector('.ym-account-menu')");
  await visit(desktop, '/search', 1000);
  assert.equal(
    await desktop.evaluate(
      "getComputedStyle(document.querySelector('.media-grid')).gridTemplateColumns.split(' ').length"
    ),
    5
  );
  await desktop.screenshot(output + '/desktop-search.png');
  await visit(desktop, '/search?q=arrival&type=movie', 1000);
  assert.ok(
    (await desktop.evaluate(
      "document.querySelectorAll('.media-grid .ym-card').length"
    )) > 0
  );
  await desktop.screenshot(output + '/desktop-search-results.png');
  await visit(desktop, '/settings', 1000);
  await desktop.screenshot(output + '/desktop-settings.png');
  await desktop.evaluate("document.querySelector('#appearance input').click()");
  await desktop.until(
    "document.documentElement.dataset.reducedMotion==='true'"
  );
  await desktop.evaluate(
    "(()=>{const s=document.querySelector('#appearance select');s.value='violet';s.dispatchEvent(new Event('change',{bubbles:true}))})()"
  );
  await visit(desktop);
  assert.equal(
    await desktop.evaluate('document.documentElement.dataset.reducedMotion'),
    'true'
  );
  assert.equal(
    await desktop.evaluate(
      "getComputedStyle(document.documentElement).getPropertyValue('--ym-accent').trim()"
    ),
    '#c5a0ff'
  );
  const frozen = await desktop.evaluate(
    "document.querySelector('.ym-hero-title img')?.alt"
  );
  await desktop.delay(8200);
  assert.equal(
    await desktop.evaluate("document.querySelector('.ym-hero-title img')?.alt"),
    frozen,
    'reduce motion disables the carousel timer'
  );
  results.push({
    check:
      'menu and Escape, search layouts and results, persistent appearance, reduced motion stops autoplay'
  });
  recordings.push({ viewport: 'desktop', ...(await stop()) });
  browserErrors.push(...desktop.errors);
} finally {
  await desktop.close();
}

const mobile = await openBrowser({ width: 390, height: 844, mobile: true });
try {
  await visit(mobile, '', 1400);
  await mobile.until(
    "document.querySelector('.ym-hero-image')?.naturalWidth > 0"
  );
  const stop = await mobile.record(output + '/mobile-frames');
  await mobile.screenshot(output + '/mobile-home.png');
  await mobile.delay(8300);
  await mobile.screenshot(output + '/mobile-hero-next.png');
  const nav = await mobile.evaluate(
    "document.querySelector('.ym-mobile-nav').getBoundingClientRect().toJSON()"
  );
  assert.ok(nav.width < 390 && nav.width >= 280);
  assert.ok(Math.abs(nav.bottom - (844 - 16)) < 1);
  await mobile.evaluate("window.scrollTo({top:650,behavior:'smooth'})");
  await mobile.delay(900);
  await mobile.screenshot(output + '/mobile-scroll.png');
  assert.equal(
    await mobile.evaluate(
      "document.querySelector('.ym-mobile-nav').getBoundingClientRect().bottom"
    ),
    nav.bottom
  );
  await mobile.evaluate(
    "document.querySelector('.ym-mobile-nav button[aria-label=Settings]').click()"
  );
  await mobile.delay(400);
  await mobile.screenshot(output + '/mobile-menu.png');
  await mobile.evaluate("document.querySelector('.menu-dismiss').click()");
  for (const path of ['/search', '/settings', '/my-list', '/movie/1368337']) {
    await visit(mobile, path);
    assert.equal(
      await mobile.evaluate(
        'document.documentElement.scrollWidth > innerWidth'
      ),
      false,
      path + ' fits mobile'
    );
    await mobile.screenshot(
      output + '/mobile-' + path.slice(1).replaceAll('/', '-') + '.png'
    );
  }
  recordings.push({ viewport: 'mobile', ...(await stop()) });
  for (const width of [320, 768]) {
    await mobile.call('Emulation.setDeviceMetricsOverride', {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await visit(mobile, '', 500);
    assert.equal(
      await mobile.evaluate(
        'document.documentElement.scrollWidth > innerWidth'
      ),
      false,
      width + 'px home fits'
    );
    await mobile.screenshot(output + '/home-' + width + '.png');
  }
  results.push({
    check:
      'mobile floating navigation, menu, search, settings, lists, detail; 320/390/768px overflow',
    nav
  });
  browserErrors.push(...mobile.errors);
} finally {
  await mobile.close();
}
assert.deepEqual(browserErrors, [], 'no browser runtime exceptions');
await writeFile(
  '.temp/design/design-results.json',
  JSON.stringify({ results, recordings, browserErrors }, null, 2)
);
console.log(JSON.stringify({ results, recordings, browserErrors }, null, 2));
