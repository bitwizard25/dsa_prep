// Log in through the user's real Chrome / Edge / Brave.
// Cloudflare's captcha fails inside app browsers but passes in a real one.
// Step 1: open a completely normal browser window (separate profile) on LeetCode's login page.
// Step 2: after the user closes it, start the same browser headless on that profile and read the cookies.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { app } = require("electron");
const cdp = require("./cdp");

function findBrowser() {
  const forced = process.env.DSA_LOGIN_BROWSER;            // optional override for testing / unusual installs
  if (forced && fs.existsSync(forced)) return forced;
  const cands = [];
  if (process.platform === "win32") {
    const bases = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
    const rel = [
      ["Google", "Chrome", "Application", "chrome.exe"],
      ["Microsoft", "Edge", "Application", "msedge.exe"],
      ["BraveSoftware", "Brave-Browser", "Application", "brave.exe"],
    ];
    for (const r of rel) for (const b of bases) cands.push(path.join(b, ...r));
  } else {
    cands.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
      "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/microsoft-edge", "/usr/bin/brave-browser");
  }
  return cands.find((f) => { try { return fs.existsSync(f); } catch { return false; } }) || null;
}

const browserName = (exe) => (/msedge/i.test(exe) ? "Edge" : /brave/i.test(exe) ? "Brave" : "Chrome");
const profileDir = () => path.join(app.getPath("userData"), "login-browser");

async function readCookiesHeadless(exe, dir) {
  try { fs.rmSync(path.join(dir, "DevToolsActivePort"), { force: true }); } catch {}
  const p = spawn(exe, [`--user-data-dir=${dir}`, "--headless=new", "--remote-debugging-port=0",
    "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  let exited = false;
  p.on("exit", () => { exited = true; });
  p.on("error", () => { exited = true; });
  try {
    let port = 0;
    for (let i = 0; i < 60 && !port && !exited; i++) {
      await cdp.wait(500);
      try { port = parseInt(fs.readFileSync(path.join(dir, "DevToolsActivePort"), "utf8").split("\n")[0], 10) || 0; } catch {}
    }
    if (!port) throw new Error(exited ? "still-open" : "no-port");
    const ver = await cdp.getJson(port, "/json/version");
    const res = await cdp.call(ver.webSocketDebuggerUrl, "Storage.getCookies");
    try { await cdp.call(ver.webSocketDebuggerUrl, "Browser.close"); } catch {}
    return {
      cookies: res.cookies.filter((c) => c.domain.endsWith("leetcode.com")),
      ua: (ver["User-Agent"] || "").replace("HeadlessChrome", "Chrome"),
    };
  } finally {
    setTimeout(() => { try { if (!exited) p.kill(); } catch {} }, 3000);
  }
}

let current = null;   // the login in progress, if any

/** Called when the user says "I closed the window". Returns false if the browser is still open. */
function confirmClosed() {
  if (!current) return false;
  if (current.running()) return false;
  current.done();
  return true;
}

/**
 * Runs the full login. `progress(text)` reports status to the UI.
 * Resolves to { ok, cookies, ua } or { ok:false, error }.
 */
async function run(progress) {
  if (current) return { ok: false, error: "busy" };
  const exe = findBrowser();
  if (!exe) return { ok: false, error: "no-browser" };
  const name = browserName(exe), dir = profileDir();
  fs.mkdirSync(dir, { recursive: true });
  try {
    const t0 = Date.now();
    const proc = spawn(exe, [`--user-data-dir=${dir}`, "--no-first-run", "--no-default-browser-check",
      "--new-window", "https://leetcode.com/accounts/login/"], { stdio: "ignore" });
    let running = true;
    progress({ step: "browser", browser: name });
    await new Promise((res) => {
      current = { done: res, running: () => running };
      // An exit in the first 5 s means the browser handed off to another process: then we wait for the button.
      proc.on("exit", () => { running = false; if (Date.now() - t0 > 5000) res(); });
      proc.on("error", () => { running = false; res(); });
      setTimeout(res, 20 * 60 * 1000);
    });
    progress({ step: "reading", browser: name });
    await cdp.wait(1500);
    let got;
    try { got = await readCookiesHeadless(exe, dir); }
    catch (e) { return { ok: false, error: e.message === "still-open" ? "still-open" : "failed", detail: e.message }; }
    if (!got.cookies.some((c) => c.name === "LEETCODE_SESSION")) return { ok: false, error: "no-login" };
    return { ok: true, ...got };
  } catch (e) {
    return { ok: false, error: "failed", detail: String((e && e.message) || e) };
  } finally {
    current = null;
  }
}

function forget() {
  try { fs.rmSync(profileDir(), { recursive: true, force: true }); } catch {}
}

module.exports = { run, confirmClosed, forget, findBrowser };
