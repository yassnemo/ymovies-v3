import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfig, phaseAt } from './config/settings.js';

test('safe defaults, bounded smoke, and intended load peaks', () => {
  const smoke = createConfig();
  assert.equal(smoke.target, 'fixture');
  assert.equal(smoke.baseUrl, 'http://127.0.0.1:5100');
  assert.equal(smoke.tokens.length, smoke.maxVus);
  for (const [profile, peak] of [
    ['normal', 50],
    ['stress', 200],
    ['spike', 200]
  ]) {
    const config = createConfig({ PERF_PROFILE: profile });
    assert.equal(Math.max(...config.stages.map((stage) => stage.target)), peak);
    assert.equal(config.stages.at(-1).target, 0);
  }
  assert.throws(() => createConfig({ PERF_VUS: '6' }), /between/);
  assert.throws(() => createConfig({ PERF_VUS: '1.5' }), /integer/);
  assert.throws(() => createConfig({ PERF_TIME_SCALE: 'NaN' }), /number/);
});

test('rejects unsafe origins, accidental remote targets and disguised production', () => {
  for (const url of [
    'https://example.com',
    'http://127.0.0.1.evil.test',
    'http://user:pass@localhost',
    'http://localhost/path',
    'http://localhost?key=secret',
    'file:///tmp',
    'http://localhost:99999'
  ]) {
    assert.throws(() => createConfig({ PERF_BASE_URL: url }));
  }
  assert.throws(
    () =>
      createConfig({
        PERF_TARGET: 'staging',
        PERF_BASE_URL: 'https://ymovies.yerradouani.me'
      }),
    /known production/
  );
  assert.throws(
    () =>
      createConfig({
        PERF_TARGET: 'staging',
        PERF_BASE_URL: 'https://ymovies.yerradouani.me.'
      }),
    /known production/
  );
  assert.throws(
    () =>
      createConfig({
        PERF_TARGET: 'production',
        PERF_BASE_URL: 'https://example.com'
      }),
    /PERF_ALLOW_PRODUCTION/
  );
});

test('production stress/spike require independent explicit opt-ins and isolated services', () => {
  const env = {
    PERF_PROFILE: 'stress',
    PERF_TARGET: 'production',
    PERF_BASE_URL: 'https://ymovies.yerradouani.me',
    PERF_ALLOW_PRODUCTION: 'true',
    PERF_EXTERNAL_SERVICES: 'isolated',
    PERF_ISOLATION_CONFIRMED: 'true'
  };
  for (const profile of ['normal', 'stress', 'spike']) {
    assert.throws(
      () => createConfig({ ...env, PERF_PROFILE: profile }),
      /PERF_ALLOW_PRODUCTION_LOAD/
    );
    assert.equal(
      createConfig({
        ...env,
        PERF_PROFILE: profile,
        PERF_ALLOW_PRODUCTION_LOAD: 'true'
      }).profile,
      profile
    );
  }
  assert.throws(
    () =>
      createConfig({
        ...env,
        PERF_ALLOW_PRODUCTION_LOAD: 'true',
        PERF_EXTERNAL_SERVICES: 'approved'
      }),
    /isolated/
  );
});

test('remote quotas and authentication sessions must be explicitly configured', () => {
  const env = {
    PERF_TARGET: 'staging',
    PERF_BASE_URL: 'https://staging.example.com'
  };
  assert.throws(() => createConfig(env), /PERF_EXTERNAL_SERVICES/);
  assert.equal(
    createConfig({ ...env, PERF_EXTERNAL_SERVICES: 'approved' }).includeAuth,
    false
  );
  const auth = {
    ...env,
    PERF_EXTERNAL_SERVICES: 'approved',
    PERF_INCLUDE_AUTH: 'true'
  };
  assert.throws(() => createConfig(auth), /one pre-provisioned/);
  assert.throws(
    () => createConfig({ ...auth, PERF_TOKENS_JSON: 'secret-not-json' }),
    /JSON array/
  );
  assert.equal(
    createConfig({ ...auth, PERF_TOKENS_JSON: '["token1","token2"]' }).tokens
      .length,
    2
  );
  assert.throws(
    () => createConfig({ ...auth, PERF_TOKENS_JSON: '["token1","token1"]' }),
    /distinct/
  );
  assert.throws(
    () => createConfig({ PERF_INCLUDE_AUTH: 'yes' }),
    /true or false/
  );
  assert.throws(
    () =>
      createConfig({
        ...env,
        PERF_EXTERNAL_SERVICES: 'approved',
        PERF_INCLUDE_AI: 'true'
      }),
    /isolated/
  );
});

test('spike recovery starts after the down-ramp and scales with the profile', () => {
  const config = createConfig({ PERF_PROFILE: 'spike', PERF_TIME_SCALE: '.1' });
  assert.equal(phaseAt(config, 0), 'baseline');
  assert.equal(phaseAt(config, config.phaseEnds[1]), 'spike');
  assert.equal(phaseAt(config, config.phaseEnds[3]), 'cooldown');
  assert.equal(phaseAt(config, config.phaseEnds[4]), 'recovery');
});
