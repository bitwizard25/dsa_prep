const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
module.exports = function loadMain(file, mocks) {
  const nativeRequire = createRequire(file);
  const exports = {};
  const context = { module: { exports }, exports, __dirname: require('node:path').dirname(file),
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : nativeRequire(name), console, setTimeout, clearTimeout, URL };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context.module.exports;
};
