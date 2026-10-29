import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../hub-src/node_modules/esbuild/lib/main.js';

test('mastery weights distinguish verified, unverified and helped solves', async () => {
  const { outputFiles } = await build({ entryPoints: ['hub-src/src/core/practice-bridge.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
  const bridge = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
  const p = { name: 'Arrays', planned: 10, alone: 4, help: 0, verified: 4 };
  assert.equal(bridge.dsaMastery(p), 0.4);
  assert.equal(bridge.dsaMastery({ ...p, verified: 0 }), 0.2);
  assert.equal(bridge.dsaMastery({ ...p, verified: 0, alone: 0, help: 4 }), 0.1);
});
