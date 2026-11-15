import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { generateReport } from './utils/report.mjs';

test('report preserves failed thresholds, content checks, endpoint ordering and escaped HTML', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ymovies-performance-'));
  try {
    const run = {
      profile: 'smoke',
      target: 'fixture',
      baseUrl: 'http://127.0.0.1:5100',
      maxVus: 1,
      exitCode: 99,
      startedAt: '2026-01-01T00:00:00Z'
    };
    await writeFile(join(directory, 'run.json'), JSON.stringify(run));
    await writeFile(
      join(directory, 'summary.json'),
      JSON.stringify({
        metrics: {
          http_req_duration: { values: { avg: 200 } },
          checks: { thresholds: { 'rate>=0.99': { ok: false } } }
        }
      })
    );
    const points = [
      ['endpoint_latency', 100, 'fast', {}],
      ['endpoint_latency', 900, '<slow>', {}],
      ['journey_requests', 1, 'fast', {}],
      ['journey_requests', 1, '<slow>', {}],
      ['endpoint_errors', 1, '<slow>', {}],
      ['checks', 0, '<slow>', { check: '<script>unsafe</script>' }],
      ['vus', 1, undefined, {}]
    ].map(([metric, value, endpoint, extra], index) =>
      JSON.stringify({
        type: 'Point',
        metric,
        data: {
          value,
          time: new Date(Date.parse(run.startedAt) + index * 100).toISOString(),
          tags: { endpoint, phase: 'load', ...extra }
        }
      })
    );
    await writeFile(join(directory, 'samples.jsonl'), points.join('\n'));
    const report = await generateReport(directory);
    assert.equal(report.passed, false);
    assert.equal(report.failedThresholds.length, 1);
    assert.equal(report.endpoints[0].endpoint, '<slow>');
    assert.equal(report.errors, 1);
    assert.equal(report.requests, 2);
    const html = await readFile(join(directory, 'report.html'), 'utf8');
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>unsafe'));
    const comparison = await generateReport(directory, {
      run: { ...run, maxVus: 200 }
    });
    assert.equal(comparison.comparison.comparable, false);
    await rm(join(directory, 'summary.json'));
    const missing = await generateReport(directory);
    assert.equal(missing.passed, false);
    assert.equal(missing.summaryAvailable, false);
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    await rm(directory, { recursive: true, force: true });
  }
});
