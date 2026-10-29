// The LeetCode panel on the right: its session (cookies), navigation rules, login detection and auth check.
const { WebContentsView, session, shell } = require("electron");

const PARTITION = "persist:leetcode";          // "persist:" keeps cookies on disk between runs
const HOME = "https://leetcode.com/problemset/";

const isLeetCode = (u) => {
  try { const { hostname: h, protocol } = new URL(u); return protocol === "https:" && (h === "leetcode.com" || h.endsWith(".leetcode.com")); }
  catch { return false; }
};
const isLoginUrl = (u) => isLeetCode(u) && /\/accounts\/(login|signup)/.test(u);

// Watches the LeetCode page for two things that don't change the URL in a useful way:
//  - the login popup (a password box) -> the app starts the real-browser login instead;
//  - an "Accepted" submission result -> the app offers one-tap marking.
const WATCH = `(() => { if (window.__dsaWatch) return; window.__dsaWatch = true;
  let last = 0;
  const check = () => {
    if (document.querySelector('input[type="password"]') && Date.now() - last > 8000) { last = Date.now(); console.log("__DSA_NEED_LOGIN__"); }
    const m = location.pathname.match(/\\/problems\\/([^/]+)\\/submissions\\/(\\d+)/);
    const res = document.querySelector('[data-e2e-locator="submission-result"]');
    if (m && res && /Accepted/.test(res.textContent) && window.__dsaAcc !== m[2]) { window.__dsaAcc = m[2]; console.log("__DSA_ACCEPTED__:" + m[1]); }
  };
  new MutationObserver(() => { clearTimeout(window.__dsaT); window.__dsaT = setTimeout(check, 250); })
    .observe(document.documentElement, { childList: true, subtree: true });
  check(); })();`;

class LeetCodeView {
  /** @param {{ send:(ch:string, data?:any)=>void, ua?:string, onUrl:(url:string)=>void }} opts */
  constructor({ send, ua, onUrl }) {
    this.send = send;
    this.focusMode = false;
    this.ses = session.fromPartition(PARTITION);
    // Look like a normal Chrome. After a browser login we reuse that browser's exact identity.
    this.ses.setUserAgent(ua || this.ses.getUserAgent().replace(/\s?Electron\/\S+/, "").replace(/\s?dsa-practice\/\S+/, ""));

    this.view = new WebContentsView({ webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true } });
    const wc = this.view.webContents;

    const guard = (e, url) => {
      if (isLoginUrl(url)) { e.preventDefault(); send("need-login"); return; }
      if (this.focusMode && !isLeetCode(url)) { e.preventDefault(); send("blocked", url); }
    };
    wc.on("will-navigate", guard);
    wc.on("will-redirect", guard);
    wc.setWindowOpenHandler(({ url }) => {
      if (isLeetCode(url)) wc.loadURL(url);                 // keep LeetCode popups inside the app
      else if (this.focusMode) send("blocked", url);
      else if (/^https?:\/\//i.test(url)) shell.openExternal(url); // only web links may launch the normal browser
      return { action: "deny" };
    });
    const nav = (_e, url) => {
      if (isLoginUrl(url)) { send("need-login"); wc.loadURL(HOME); return; }
      send("lc-url", url);
      onUrl(url);
    };
    wc.on("did-navigate", nav);
    wc.on("did-navigate-in-page", nav);
    wc.on("dom-ready", () => { if (isLeetCode(wc.getURL())) wc.executeJavaScript(WATCH).catch(() => {}); });
    wc.on("console-message", ({ message: msg }) => {
      if (msg === "__DSA_NEED_LOGIN__") send("need-login");
      else if (typeof msg === "string" && msg.startsWith("__DSA_ACCEPTED__:")) send("accepted", msg.slice(17));
    });
  }

  get wc() { return this.view.webContents; }
  load(url) { this.wc.loadURL(isLeetCode(url) ? url : HOME); }
  open(slug) {
    if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) return false;
    this.wc.loadURL(`https://leetcode.com/problems/${slug}/`);
    return true;
  }
  home() { this.wc.loadURL(HOME); }
  back() {
    const h = this.wc.navigationHistory;
    if (h ? h.canGoBack() : this.wc.canGoBack()) h ? h.goBack() : this.wc.goBack();
  }
  url() { return this.wc.getURL(); }

  setFocus(on) {
    this.focusMode = !!on;
    if (this.focusMode && !isLeetCode(this.url())) this.home();
    return this.focusMode;
  }

  reloadAndWait() {
    return new Promise((res) => {
      const done = () => { clearTimeout(t); res(); };
      const t = setTimeout(done, 15000);
      this.wc.once("did-finish-load", done);
      this.home();
    });
  }

  /** Ask LeetCode itself who is logged in (runs inside the page, using its own cookies). */
  async authStatus() {
    const has = (await this.ses.cookies.get({ url: "https://leetcode.com", name: "LEETCODE_SESSION" })).length > 0;
    if (!has) return { signedIn: false };
    if (isLeetCode(this.url())) {
      try {
        const q = this.wc.executeJavaScript(`fetch("/graphql/", {
          method: "POST", credentials: "include",
          headers: { "content-type": "application/json", "x-csrftoken": (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || "" },
          body: JSON.stringify({ query: "{ userStatus { isSignedIn username } }" })
        }).then(r => r.json()).then(j => j.data.userStatus).catch(() => null)`);
        const r = await Promise.race([q, new Promise((res) => setTimeout(() => res(null), 6000))]);
        if (r) return { signedIn: !!r.isSignedIn, username: r.username || "" };
      } catch {}
    }
    return { signedIn: true, username: "", unverified: true };
  }

  /** Copy cookies (from the real browser) into this panel, and adopt that browser's identity. */
  async importCookies(list, ua) {
    const twoWeeks = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14;
    const sameSite = { Strict: "strict", Lax: "lax", None: "no_restriction" };
    for (const c of list) {
      const host = c.domain.replace(/^\./, "");
      const d = {
        url: `https://${host}${c.path || "/"}`, name: c.name, value: c.value, path: c.path || "/",
        secure: !!c.secure, httpOnly: !!c.httpOnly,
        expirationDate: !c.session && c.expires > 0 ? c.expires : twoWeeks,
      };
      if (c.domain.startsWith(".")) d.domain = c.domain;
      if (c.sameSite && sameSite[c.sameSite]) d.sameSite = sameSite[c.sameSite];
      try { await this.ses.cookies.set(d); } catch (e) { console.warn("cookie skipped:", c.name, e.message); }
    }
    await this.ses.cookies.flushStore();
    if (ua) { this.ses.setUserAgent(ua); this.wc.setUserAgent(ua); }
  }

  async logout() {
    await this.ses.clearStorageData();
    this.home();
  }
}

module.exports = { LeetCodeView, isLeetCode, HOME };
