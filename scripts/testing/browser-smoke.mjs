import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const base = process.env.TEST_BASE_URL || 'http://localhost:5000';
const profile = resolve(tmpdir(), `ymovies-svelte-browser-${Date.now()}`);
await mkdir('.temp', { recursive: true });
await mkdir(profile, { recursive: true });
const browser = spawn(
  process.env.CHROME_PATH ||
    (process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : 'google-chrome'),
  [
    '--headless=new',
    '--disable-extensions',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ],
  { windowsHide: true, stdio: 'ignore' }
);
let socket;
let counter = 0;
const pending = new Map();
const errors = [];
const results = [];
try {
  let port;
  for (let i = 0; i < 80; i++) {
    try {
      port = Number(
        (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split(
          '\n'
        )[0]
      );
      break;
    } catch {
      await new Promise((done) => setTimeout(done, 150));
    }
  }
  assert.ok(port, 'Chrome debugging port');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(
    pages.find((page) => page.type === 'page').webSocketDebuggerUrl
  );
  await new Promise((done, reject) => {
    socket.onopen = done;
    socket.onerror = reject;
  });
  socket.onmessage = (event) => {
    const value = JSON.parse(event.data);
    if (value.id) {
      const entry = pending.get(value.id);
      pending.delete(value.id);
      value.error
        ? entry?.reject(new Error(JSON.stringify(value.error)))
        : entry?.resolve(value.result);
    } else if (value.method === 'Runtime.exceptionThrown')
      errors.push(
        value.params.exceptionDetails.exception?.description ||
          value.params.exceptionDetails.text
      );
    else if (
      value.method === 'Runtime.consoleAPICalled' &&
      value.params.type === 'error'
    )
      errors.push(
        value.params.args.map((arg) => arg.value || arg.description).join(' ')
      );
    else if (
      value.method === 'Network.responseReceived' &&
      value.params.response.status >= 400 &&
      value.params.response.url.startsWith(base)
    )
      errors.push(
        `HTTP ${value.params.response.status} ${value.params.response.url}`
      );
  };
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++counter;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  const evaluate = async (expression) => {
    const response = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (response.exceptionDetails)
      throw new Error(
        response.exceptionDetails.exception?.description ||
          response.exceptionDetails.text
      );
    return response.result.value;
  };
  async function until(expression, message, timeout = 40000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) return;
      await new Promise((done) => setTimeout(done, 150));
    }
    throw new Error(`Timed out: ${message}`);
  }
  async function visit(path, expected) {
    await call('Page.navigate', { url: base + path });
    await until(
      `document.readyState === 'complete' && document.body.innerText.includes(${JSON.stringify(expected)})`,
      path
    );
    await until(
      `document.querySelector('script[src*="vite"]') || !!document.querySelector('[data-sveltekit-preload-data]')`,
      'Svelte root'
    );
    await new Promise((done) => setTimeout(done, 1500));
    results.push({
      path,
      title: await evaluate('document.title'),
      cards: await evaluate("document.querySelectorAll('.media-card').length")
    });
  }
  await call('Page.enable');
  await call('Page.bringToFront');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Network.setBlockedURLs', {
    urls: [
      '*://*.googletagmanager.com/*',
      '*://*.google-analytics.com/*',
      '*://*.analytics.google.com/*'
    ]
  });
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await call('Page.addScriptToEvaluateOnNewDocument', {
    source: `if (!localStorage.getItem('ymovies:preferences:guest')) { localStorage.setItem('user_watchlist', JSON.stringify([{id:550,title:'Fight Club',media_type:'movie',poster_path:null}])); }`
  });
  await visit('/', 'Browse by Provider');
  await visit('/my-list?tab=watchlist', 'My Lists');
  await until(
    `document.querySelectorAll('.media-card').length === 1`,
    'legacy watchlist migration'
  );
  assert.equal(
    await evaluate("document.querySelector('.card-title').textContent"),
    'Fight Club'
  );
  await visit('/home', 'Trending Movies');
  await until(
    "document.documentElement.dataset.appReady === 'true'",
    'home hydration and local preferences'
  );
  await until(
    `document.querySelectorAll('.media-card').length > 10 && !!document.querySelector('.provider-section')`,
    'home hydration'
  );

  const initial = await evaluate(
    "JSON.parse(localStorage.getItem('ymovies:preferences:guest')).watchlist.length"
  );
  await evaluate(
    "document.querySelector('.media-card .card-actions button').click()"
  );
  await until(
    `JSON.parse(localStorage.getItem('ymovies:preferences:guest')).watchlist.length !== ${initial}`,
    'watchlist toggle'
  );
  await writeFile(
    '.temp/svelte-home-desktop.png',
    Buffer.from(
      (await call('Page.captureScreenshot', { format: 'png' })).data,
      'base64'
    )
  );
  const firstDetail = await evaluate(
    "new URL(document.querySelector('.media-card .poster').href).pathname"
  );
  await visit(firstDetail, 'Your watch progress');
  await until(
    `document.querySelectorAll('.detail-hero button').length > 1`,
    'detail buttons'
  );
  await evaluate(
    "[...document.querySelectorAll('button')].find(value => value.textContent.includes('Mark watched'))?.click()"
  );
  await new Promise((done) => setTimeout(done, 1500));
  await until(
    `document.body.innerText.includes('Completed')`,
    'watch progress'
  );
  if (
    await evaluate(
      "[...document.querySelectorAll('button')].some(value => value.textContent.includes('Watch trailer'))"
    )
  ) {
    await evaluate(
      "[...document.querySelectorAll('button')].find(value => value.textContent.includes('Watch trailer')).click()"
    );
    await until(
      "document.querySelector('dialog')?.open && !!document.querySelector('iframe')",
      'trailer modal'
    );
    await evaluate("document.querySelector('dialog button').click()");
    assert.equal(
      await evaluate("document.querySelector('dialog').open"),
      false
    );
  }
  await visit('/my-list?tab=collections', 'Your collections');
  await evaluate(
    "document.querySelector('input[aria-label=\"New collection name\"]').value='Weekend'; document.querySelector('input[aria-label=\"New collection name\"]').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.collection-form').requestSubmit()"
  );
  await until(
    "document.querySelector('.collection-card h3')?.textContent === 'Weekend'",
    'create collection'
  );
  await call('Page.reload');
  await until(
    "document.body.innerText.includes('Weekend')",
    'collection persists on reload'
  );
  await visit('/movies', 'Movies');
  await visit('/tv', 'TV shows');
  await visit('/genre/movie/action', 'Action');
  await visit('/search?q=arrival&type=movie', 'Results for');
  await visit(
    '/search?type=movie&year=2016&rating=7&sortBy=vote_average.desc',
    'Discover titles'
  );
  assert.ok(
    await evaluate(
      "[...document.querySelectorAll('.card-meta')].every(value => value.textContent.includes('2016'))"
    ),
    'discovery applies year without a text query'
  );
  await evaluate(
    "const input = document.querySelector('input[name=q]'); input.focus(); input.value='inception'; input.dispatchEvent(new Event('input', {bubbles:true}))"
  );
  await until(
    "document.querySelectorAll('#search-suggestions li').length > 0",
    'search suggestions'
  );
  await evaluate(
    "document.querySelector('input[name=q]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))"
  );
  assert.ok(
    await evaluate(
      "document.querySelector('input[name=q]').getAttribute('aria-activedescendant')"
    ),
    'keyboard selects a suggestion'
  );
  await evaluate(
    "document.querySelector('input[name=q]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))"
  );
  await until(
    "!document.querySelector('#search-suggestions')",
    'escape dismisses suggestions'
  );
  await visit('/movies?genre=28&year=2020&sort=popularity.desc', 'Movies');
  assert.ok(
    await evaluate(
      "[...document.querySelectorAll('.card-meta')].every(value => value.textContent.includes('2020'))"
    ),
    'browse year filter'
  );
  await visit(
    '/auth/callback?error=access_denied&error_description=Cancelled',
    'Unable to complete sign in'
  );
  assert.ok(
    await evaluate("document.body.innerText.includes('Cancelled')"),
    'OAuth errors are recoverable'
  );
  await visit('/tv/1399', 'Game of Thrones');
  await evaluate(
    "[...document.querySelectorAll('.tabs button')].find(value => value.textContent === 'Episodes').click()"
  );
  await until(
    "document.querySelectorAll('.episode').length > 0",
    'TV episodes'
  );
  await evaluate("document.querySelector('.episode input').click()");
  await until(
    "document.querySelector('.episode').classList.contains('watched')",
    'episode tracking'
  );
  await visit('/profile', 'Your profile');
  await visit('/settings', 'Settings');
  await evaluate(
    "document.querySelector('#activity .toggle-row input').click()"
  );
  assert.ok(
    await evaluate(
      "JSON.parse(localStorage.getItem('ymovies:preferences:guest')).appSettings.notifications.recommendations === false"
    )
  );
  await visit('/signin', 'Welcome back');
  await visit('/signup', 'Make room for great stories');
  await visit('/reset-password', 'Reset your password');
  await visit('/confirm-reset-password', 'Choose a new password');
  await visit('/privacy', 'Privacy Policy');
  await visit('/terms', 'Terms of Service');
  await call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await visit('/home', 'Trending Movies');
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.mobile-nav')).display"
    ),
    'flex'
  );
  assert.ok(
    await evaluate('document.documentElement.scrollWidth <= innerWidth'),
    'mobile has no horizontal overflow'
  );
  await writeFile(
    '.temp/svelte-home-mobile.png',
    Buffer.from(
      (await call('Page.captureScreenshot', { format: 'png' })).data,
      'base64'
    )
  );
  console.log(JSON.stringify({ results, errors }, null, 2));
  await writeFile(
    '.temp/svelte-browser-results.json',
    JSON.stringify({ results, errors }, null, 2)
  );
  assert.equal(
    errors.filter(
      (error) =>
        !error.includes('net::ERR') &&
        !error.includes('Failed to load resource')
    ).length,
    0,
    'no browser runtime errors'
  );
} catch (error) {
  console.log(JSON.stringify({ results, errors }, null, 2));
  throw error;
} finally {
  socket?.close();
  browser.kill();
}
