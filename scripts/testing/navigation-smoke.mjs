import assert from 'node:assert/strict';
import { openBrowser } from './design-browser.mjs';

const base = process.env.TEST_BASE_URL || 'http://localhost:5000';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844, mobile: true }
]) {
  const browser = await openBrowser(viewport);
  try {
    await browser.navigate(base + '/about');
    await browser.until("document.documentElement.dataset.appReady === 'true'");
    await browser.evaluate(`(() => {
      window.transitionCalls = [];
      window.transitionFailures = [];
      window.pageIdentity = {};
      window.initialPageIdentity = window.pageIdentity;
      window.nativeTransition = document.startViewTransition.bind(document);
      window.instrumentedTransition = (update) => {
        const transition = window.nativeTransition(update);
        window.transitionCalls.push(transition);
        transition.ready.catch(error => window.transitionFailures.push(String(error)));
        return transition;
      };
      document.startViewTransition = window.instrumentedTransition;
    })()`);

    async function follow(path) {
      await browser.evaluate(`(() => {
        const link = document.createElement('a');
        link.href = ${JSON.stringify(path)};
        document.body.append(link);
        link.click();
        link.remove();
      })()`);
      await browser.until(
        `location.pathname + location.search + location.hash === ${JSON.stringify(path)}`
      );
    }
    async function finish() {
      await browser.evaluate(
        'Promise.allSettled(window.transitionCalls.map(t => t.finished))'
      );
    }
    const count = () => browser.evaluate('window.transitionCalls.length');

    // Use an existing link first; subsequent checks exercise the same delegated router.
    await browser.evaluate(
      'document.querySelector(\'.site-footer a[href="/privacy"]\').click()'
    );
    await browser.until("location.pathname === '/privacy'");
    await finish();
    assert.equal(await count(), 1);
    assert.equal(
      await browser.evaluate(
        'window.pageIdentity === window.initialPageIdentity'
      ),
      true
    );
    assert.equal(
      await browser.evaluate(
        "getComputedStyle(document.documentElement, '::view-transition-new(app-content)').animationDuration"
      ),
      '0.16s'
    );
    assert.equal(
      await browser.evaluate(
        "getComputedStyle(document.documentElement, '::view-transition-new(root)').animationName"
      ),
      'none'
    );
    assert.equal(
      await browser.evaluate(
        "getComputedStyle(document.documentElement, '::view-transition-new(app-content)').filter"
      ),
      'none'
    );

    await follow('/privacy?test=navigation');
    await follow('/privacy?test=navigation#main');
    assert.equal(await count(), 1, 'query and anchor changes do not animate');
    await follow('/terms');
    await browser.evaluate('history.back()');
    await browser.until("location.pathname === '/privacy'");
    await browser.evaluate('history.forward()');
    await browser.until("location.pathname === '/terms'");
    await finish();
    assert.equal(await count(), 4, 'back/forward navigation remains animated');

    await browser.call('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    await follow('/about');
    assert.equal(await count(), 4, 'system reduced motion skips snapshots');
    await browser.call('Emulation.setEmulatedMedia', { features: [] });
    await follow('/settings');
    await finish();
    await browser.evaluate(
      "document.querySelector('#appearance input[type=checkbox]').click()"
    );
    await browser.until(
      "document.documentElement.dataset.reducedMotion === 'true'"
    );
    const beforeReduced = await count();
    await follow('/about');
    assert.equal(
      await count(),
      beforeReduced,
      'in-app reduced motion skips snapshots'
    );
    await follow('/settings');
    await browser.evaluate(
      "document.querySelector('#appearance input[type=checkbox]').click()"
    );
    await browser.until(
      "document.documentElement.dataset.reducedMotion === 'false'"
    );

    // Unsupported APIs and capture failures must not stall navigation.
    await browser.evaluate('document.startViewTransition = undefined');
    await follow('/terms');
    await browser.evaluate(
      "document.startViewTransition = () => { throw new Error('capture unavailable'); }"
    );
    await follow('/privacy');
    await browser.evaluate(`document.startViewTransition = () => ({
      ready: Promise.reject(new Error('snapshot skipped')),
      finished: Promise.resolve(),
      skipTransition() {}
    })`);
    await follow('/about');
    await browser.evaluate(
      'document.startViewTransition = window.instrumentedTransition'
    );
    await follow('/privacy');
    await follow('/terms');
    await finish();
    assert.equal(
      await browser.evaluate(
        'window.pageIdentity === window.initialPageIdentity'
      ),
      true
    );
    const failures = await browser.evaluate('window.transitionFailures');
    assert.ok(
      failures.every((message) => /AbortError/.test(message)),
      JSON.stringify(failures)
    );
    assert.deepEqual(browser.errors, []);

    // The optimized face must decode, rather than silently falling back to a system font.
    assert.equal(
      await browser.evaluate(`(async () => {
      const faces = await document.fonts.load('400 16px Inter', 'YMovies');
      return faces.some(face => face.status === 'loaded' && face.unicodeRange !== 'U+0-10FFFF');
    })()`),
      true
    );
    const fonts = await browser.evaluate(
      "performance.getEntriesByType('resource').filter(r => /\\/fonts\\//.test(r.name)).map(r => ({file: new URL(r.name).pathname, bytes: r.decodedBodySize}))"
    );
    assert.ok(
      fonts.every((font) => !font.file.endsWith('.ttf')),
      'the old TTF is never requested'
    );
    assert.ok(
      fonts.reduce((total, font) => total + font.bytes, 0) < 876576,
      'combined font payload is smaller than the previous font'
    );
    assert.equal(
      await browser.evaluate(`(async () => {
      const faces = await document.fonts.load('400 16px Inter', 'Ελληνικά Кириллица');
      return faces.some(face => face.status === 'loaded' && face.unicodeRange === 'U+0-10FFFF');
    })()`),
      true,
      'the full fallback decodes for non-Latin text'
    );
    console.log(
      JSON.stringify({
        viewport,
        checks:
          'navigation, history, rapid clicks, reduced motion, API failure recovery, font decoding',
        fonts
      })
    );
  } finally {
    await browser.close();
  }
}
