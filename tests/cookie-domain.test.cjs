const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./load-main.cjs");

test("cookie domains match leetcode.com or a real subdomain only", () => {
  const { isLeetCodeDomain } = load(path.resolve("src/main/browser-login.js"), {
    electron: { app: { getPath: () => "/tmp" } },
    "./cdp": {},
  });
  for (const host of ["leetcode.com", ".leetcode.com", "www.leetcode.com", ".assets.leetcode.com"]) assert.equal(isLeetCodeDomain(host), true, host);
  for (const host of ["evilleetcode.com", "leetcode.com.evil.test", "notleetcode.com", "", "leetcode.co"]) assert.equal(isLeetCodeDomain(host), false, host);
});
