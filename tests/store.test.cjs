const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const load = require('./load-main.cjs');

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-store-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = load(path.resolve('src/main/store.js'), { electron: { app: { getPath: () => dir } } });
  return { dir, store };
}

test('round-trips state and leaves no temporary files', t => {
  const { dir, store } = setup(t);
  store.write('state.json', { solved: ['two-sum'] });
  assert.equal(JSON.stringify(store.read('state.json')), '{"solved":["two-sum"]}');
  assert.ok(!fs.readdirSync(dir).some(f => f.endsWith('.tmp')));
});

test('recovers the previous valid save if the primary file is damaged', t => {
  const { dir, store } = setup(t);
  store.write('state.json', { solved: 1 });
  store.write('state.json', { solved: 2 });
  fs.writeFileSync(path.join(dir, 'state.json'), '{broken');
  assert.equal(store.read('state.json')?.solved, 1);
  store.write('state.json', { solved: 3 });
  fs.writeFileSync(path.join(dir, 'state.json'), '{broken again');
  assert.equal(store.read('state.json')?.solved, 1);
});

test('refuses paths outside the app data directory', t => {
  const { store } = setup(t);
  assert.throws(() => store.write('../outside.json', {}), /filename/i);
});
