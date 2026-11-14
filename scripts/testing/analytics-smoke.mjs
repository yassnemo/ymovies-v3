import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './design-browser.mjs';

await mkdir('.temp/analytics', { recursive: true });
const browser = await openBrowser({ analytics: true });
const pages = await (
  await fetch('http://127.0.0.1:' + browser.port + '/json')
).json();
const socket = new WebSocket(
  pages.find((p) => p.type === 'page').webSocketDebuggerUrl
);
await new Promise((done, reject) => {
  socket.onopen = done;
  socket.onerror = reject;
});
let sequence = 0;
const pending = new Map();
const events = [];
const scripts = [];
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
socket.onmessage = (message) => {
  const event = JSON.parse(message.data);
  if (event.id) {
    const request = pending.get(event.id);
    pending.delete(event.id);
    event.error ? request?.reject(event.error) : request?.resolve(event.result);
    return;
  }
  if (
    event.method === 'Network.requestWillBeSent' &&
    event.params.request.url.includes('googletagmanager.com/gtag/js')
  )
    scripts.push(event.params.request.url);
  if (event.method === 'Fetch.requestPaused') {
    const { requestId, request } = event.params;
    const url = new URL(request.url);
    for (const line of (request.postData || '').split('\n')) {
      const parameters = new URLSearchParams(url.search);
      for (const [key, value] of new URLSearchParams(line))
        parameters.set(key, value);
      if (parameters.get('en'))
        events.push({
          event: parameters.get('en'),
          path: parameters.get('dl')
            ? new URL(parameters.get('dl')).pathname
            : null,
          title: parameters.get('dt')
        });
    }
    void call('Fetch.fulfillRequest', {
      requestId,
      responseCode: 204,
      responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
    }).catch(() => {});
  }
};
try {
  await call('Network.enable');
  // Fulfill measurement requests locally so verification does not create real visits.
  await call('Fetch.enable', {
    patterns: [
      { urlPattern: '*://*.google-analytics.com/*' },
      { urlPattern: '*://*.analytics.google.com/*' },
      { urlPattern: '*://*.google.com/ccm/*' },
      { urlPattern: '*://*.doubleclick.net/*' },
      { urlPattern: '*://*.googleadservices.com/*' }
    ]
  });
  await browser.navigate(
    (process.env.TEST_BASE_URL || 'http://localhost:5000') + '/',
    1000
  );
  await browser.until("document.documentElement.dataset.appReady==='true'");
  await browser.evaluate("window.__analyticsTestDocument='original'");
  await browser.delay(2500);
  const initial = await browser.evaluate(
    "({scripts:document.querySelectorAll('script[src*=\"googletagmanager.com/gtag/js\"]').length,configs:window.dataLayer?.filter(v=>v[0]==='config'&&v[1]==='G-0HC7C4GFD5').length,gtag:typeof window.gtag,googleLoaded:typeof window.google_tag_manager==='object'})"
  );
  assert.equal(initial.scripts, 1);
  assert.equal(initial.configs, 1);
  assert.equal(initial.gtag, 'function');
  assert.equal(
    initial.googleLoaded,
    true,
    'the Google SDK must load to verify measurement'
  );
  await browser.click('.ym-desktop-nav a[href="/movies"]');
  await browser.until("location.pathname==='/movies'");
  await browser.delay(2500);
  assert.equal(
    await browser.evaluate('window.__analyticsTestDocument'),
    'original',
    'navigation uses the SvelteKit router'
  );
  await browser.click('.ym-desktop-nav a[href="/search"]');
  await browser.until(
    "location.pathname==='/search' && document.title.startsWith('Search Movies')"
  );
  await browser.until(
    "window.dataLayer.some(v=>v[0]==='event' && v[1]==='page_view' && v[2]?.page_location.endsWith('/search'))"
  );
  await browser.delay(6500);
  assert.equal(
    await browser.evaluate(
      'document.querySelectorAll(\'script[src*="googletagmanager.com/gtag/js"]\').length'
    ),
    1
  );
  assert.equal(
    await browser.evaluate(
      "window.dataLayer.filter(v=>v[0]==='config'&&v[1]==='G-0HC7C4GFD5').length"
    ),
    1
  );
  const pageviews = events.filter((e) => e.event === 'page_view');
  const result = {
    initial,
    tagLoads: scripts.length,
    pageviews,
    errors: browser.errors
  };
  await writeFile(
    '.temp/analytics/browser-results.json',
    JSON.stringify(result, null, 2)
  );
  console.log(JSON.stringify(result, null, 2));
  for (const path of ['/', '/movies', '/search'])
    assert.equal(
      pageviews.filter((e) => e.path === path).length,
      1,
      'one manual page view for ' + path
    );
  assert.deepEqual(browser.errors, []);
} finally {
  socket.close();
  await browser.close();
}
