import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

export async function openBrowser({
  width = 1440,
  height = 900,
  mobile = false
} = {}) {
  const profile = resolve(tmpdir(), `ymovies-design-${Date.now()}`);
  await mkdir(profile, { recursive: true });
  const browserProcess = spawn(
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
  let port;
  for (let i = 0; i < 100; i++) {
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
  if (!port) {
    browserProcess.kill();
    throw new Error('Chrome did not expose its debugging port.');
  }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const socket = new WebSocket(
    targets.find((target) => target.type === 'page').webSocketDebuggerUrl
  );
  await new Promise((done, reject) => {
    socket.onopen = done;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  const listeners = new Map();
  const errors = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error)
        request?.reject(new Error(JSON.stringify(message.error)));
      else request?.resolve(message.result);
    } else {
      for (const listener of listeners.get(message.method) || [])
        listener(message.params);
      if (message.method === 'Runtime.exceptionThrown')
        errors.push(
          message.params.exceptionDetails.exception?.description ||
            message.params.exceptionDetails.text
        );
    }
  };
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome timed out: ${method}`));
      }, 30000);
      pending.set(id, {
        resolve(value) {
          clearTimeout(timeout);
          resolve(value);
        },
        reject(error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const value = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (value.exceptionDetails)
      throw new Error(
        value.exceptionDetails.exception?.description ||
          value.exceptionDetails.text
      );
    return value.result.value;
  }
  const delay = (ms) => new Promise((done) => setTimeout(done, ms));
  async function until(expression, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) return;
      await delay(150);
    }
    throw new Error(`Timed out: ${expression}`);
  }
  async function navigate(url, settle = 2000) {
    await call('Page.navigate', { url });
    await until("document.readyState === 'complete'");
    await delay(settle);
  }
  async function screenshot(path, fullPage = false) {
    let clip;
    if (fullPage) {
      const { cssContentSize } = await call('Page.getLayoutMetrics');
      clip = {
        x: 0,
        y: 0,
        width: cssContentSize.width,
        height: Math.min(cssContentSize.height, 20000),
        scale: 1
      };
    }
    const result = await call('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: fullPage,
      ...(clip ? { clip } : {})
    });
    await writeFile(path, Buffer.from(result.data, 'base64'));
  }
  async function record(directory) {
    await mkdir(directory, { recursive: true });
    const frames = [];
    const writes = [];
    const handler = (frame) => {
      const index = frames.length;
      const file = `frame-${String(index).padStart(5, '0')}.jpg`;
      frames.push({ file, timestamp: frame.metadata.timestamp });
      writes.push(
        writeFile(resolve(directory, file), Buffer.from(frame.data, 'base64'))
      );
      void call('Page.screencastFrameAck', { sessionId: frame.sessionId });
    };
    listeners.set('Page.screencastFrame', [handler]);
    await call('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: width,
      maxHeight: height,
      everyNthFrame: 1
    });
    return async () => {
      await call('Page.stopScreencast');
      await delay(100);
      listeners.delete('Page.screencastFrame');
      await Promise.all(writes);
      const lines = [];
      frames.forEach((frame, index) => {
        lines.push(`file '${frame.file}'`);
        lines.push(
          `duration ${Math.max(0.025, frames[index + 1] ? frames[index + 1].timestamp - frame.timestamp : 0.15).toFixed(6)}`
        );
      });
      if (frames.length) lines.push(`file '${frames.at(-1).file}'`);
      await writeFile(
        resolve(directory, 'frames.ffconcat'),
        'ffconcat version 1.0\n' + lines.join('\n') + '\n'
      );
      return {
        frames: frames.length,
        seconds: frames.length
          ? frames.at(-1).timestamp - frames[0].timestamp
          : 0,
        directory
      };
    };
  }
  async function hover(selector, index = 0) {
    const box = await evaluate(
      `(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)return null;const b=el.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`
    );
    if (box)
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...box });
    return box;
  }
  async function click(selector, index = 0) {
    const box = await hover(selector, index);
    if (!box) return false;
    await call('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      button: 'left',
      clickCount: 1,
      ...box
    });
    await call('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      button: 'left',
      clickCount: 1,
      ...box
    });
    return true;
  }
  await call('Page.enable');
  await call('Page.bringToFront');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile
  });
  await call('Emulation.setTouchEmulationEnabled', {
    enabled: mobile,
    maxTouchPoints: 1
  });
  return {
    call,
    evaluate,
    until,
    navigate,
    screenshot,
    record,
    delay,
    hover,
    click,
    errors,
    port,
    async close() {
      await Promise.race([call('Browser.close').catch(() => {}), delay(500)]);
      for (const request of pending.values()) request.resolve(undefined);
      pending.clear();
      socket.close();
      browserProcess.kill();
    }
  };
}
