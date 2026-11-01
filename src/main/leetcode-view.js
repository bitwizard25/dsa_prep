// The LeetCode panel on the right: its session (cookies), navigation rules, login detection and auth check.
const { WebContentsView, session, shell } = require("electron");

const PARTITION = "persist:leetcode";          // "persist:" keeps cookies on disk between runs
const HOME = "https://leetcode.com/problemset/";

const isLeetCode = (u) => {
  try { const { hostname: h, protocol } = new URL(u); return protocol === "https:" && (h === "leetcode.com" || h.endsWith(".leetcode.com")); }
  catch { return false; }
};
const isLoginUrl = (u) => isLeetCode(u) && /\/accounts\/(login|signup)/.test(u);

// A status counts only when a line is exactly "Accepted". "Not Accepted" does not.
function exactAccepted(text) {
  return String(text || "").split(/\n/).map((s) => s.trim()).filter(Boolean).includes("Accepted");
}
/**
 * Decide whether this page view is a fresh Accepted result.
 * The submission that is already on screen (or opened from the submissions list) is old.
 * A result counts only after the user leaves the problem editor for a new submission id,
 * on leetcode.com, and the status line is exactly Accepted.
 */
function trackSubmission(state, href, statusText) {
  const next = state || { prevPath: "", fresh: {}, done: {} };
  next.fresh ||= {}; next.done ||= {};
  let url;
  try { url = new URL(href); } catch { return { fire: false, state: next }; }
  const host = url.hostname;
  if (url.protocol !== "https:" || !(host === "leetcode.com" || host.endsWith(".leetcode.com"))) return { fire: false, state: next };
  const m = url.pathname.match(/^\/problems\/([a-z0-9-]+)\/submissions\/(\d+)\/?$/);
  if (!m) { next.prevPath = url.pathname; return { fire: false, state: next }; }
  const slug = m[1], id = m[2];
  const fromEditor = /^\/problems\/[a-z0-9-]+\/(description\/?)?$/.test(next.prevPath || "");
  if (next.fresh[id] === undefined) next.fresh[id] = fromEditor;
  next.prevPath = url.pathname;
  const accepted = String(statusText || "").split(/\n/).map((s) => s.trim()).filter(Boolean).includes("Accepted");
  if (!next.fresh[id] || next.done[id]) return { fire: false, state: next, slug, id };
  if (!accepted) return { fire: false, state: next, slug, id };
  next.done[id] = true;
  return { fire: true, state: next, slug, id };
}

// Watches the LeetCode page for two things that don't change the URL in a useful way:
//  - the login popup (a password box) -> the app starts the real-browser login instead;
//  - a fresh "Accepted" submission for the problem the user just submitted.
const WATCH = `(() => { if (window.__dsaWatch) return; window.__dsaWatch = true;
  const track = ${trackSubmission.toString()};
  const state = { prevPath: "", fresh: {}, done: {} };
  let last = 0;
  const check = () => {
    if (document.querySelector('input[type="password"]') && Date.now() - last > 8000) { last = Date.now(); console.log("__DSA_NEED_LOGIN__"); }
    const res = document.querySelector('[data-e2e-locator="submission-result"]');
    const out = track(state, location.href, res ? res.textContent : "");
    if (out.fire) console.log("__DSA_ACCEPTED__:" + out.slug);
  };
  new MutationObserver(() => { clearTimeout(window.__dsaT); window.__dsaT = setTimeout(check, 250); })
    .observe(document.documentElement, { childList: true, subtree: true });
  check(); })();`;

// The editor normally occupies the right side. This is a visual aid, not a security boundary;
// its position may need adjustment when LeetCode changes its layout.
const coverScript = (on) => `(() => {
  window.__dsaCoverOn = ${on ? "true" : "false"};
  let cover = document.getElementById("__dsaCover");
  if (!window.__dsaCoverOn) { if (cover) cover.remove(); return; }
  if (!cover) {
    cover = document.createElement("div"); cover.id = "__dsaCover"; cover.setAttribute("role", "note");
    cover.style.cssText = "position:fixed;top:0;right:0;bottom:0;width:55%;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:32px;text-align:center;background:rgba(21,26,33,.94);color:#E4E8EE;font:600 16px/1.5 system-ui,sans-serif;box-sizing:border-box";
    cover.textContent = "Think first. This cover is only a reminder, not proof. Answer the questions in the sidebar, then the editor opens.";
    document.documentElement.appendChild(cover);
  }
  if (!window.__dsaKeyGuard) {
    window.__dsaKeyGuard = true;
    for (const type of ["keydown", "keypress", "beforeinput", "paste", "drop"]) document.addEventListener(type, event => {
      if (window.__dsaCoverOn && !(event.ctrlKey && event.altKey)) { event.preventDefault(); event.stopPropagation(); }
    }, true);
  }
})();`;

class LeetCodeView {
  /** @param {{ send:(ch:string, data?:any)=>void, ua?:string, onUrl:(url:string)=>void }} opts */
  constructor({ send, ua, onUrl }) {
    this.send = send;
    this.focusMode = false;
    this.coverOn = false;
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
    wc.on("dom-ready", () => {
      if (!isLeetCode(wc.getURL())) return;
      wc.executeJavaScript(WATCH).catch(() => {});
      if (this.coverOn) wc.executeJavaScript(coverScript(true)).catch(() => {});
    });
    wc.on("did-navigate-in-page", () => {
      if (this.coverOn && isLeetCode(wc.getURL())) wc.executeJavaScript(coverScript(true)).catch(() => {});
    });
    wc.on("console-message", ({ message: msg }) => {
      if (msg === "__DSA_NEED_LOGIN__") send("need-login");
      else if (typeof msg === "string" && msg.startsWith("__DSA_ACCEPTED__:")) {
        const slug = msg.slice("__DSA_ACCEPTED__:".length);
        let current = "";
        try { current = new URL(wc.getURL()).pathname.match(/^\/problems\/([a-z0-9-]+)\/submissions\/\d+\/?$/)?.[1] || ""; } catch {}
        if (isLeetCode(wc.getURL()) && current && current === slug) send("accepted", slug);
      }
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

  /** Fetch statement HTML and tags in the LeetCode session; callers must not persist the HTML. */
  async problemMeta(slug) {
    if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) || !isLeetCode(this.url())) return null;
    let timer;
    try {
      const body = JSON.stringify({ query: "query q($s: String!) { question(titleSlug: $s) { content topicTags { name } } }", variables: { s: slug } });
      const script = `(async () => { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5500); try { const r = await fetch("/graphql/", { method: "POST", credentials: "include", signal: controller.signal, headers: { "content-type": "application/json", "x-csrftoken": (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || "" }, body: ${JSON.stringify(body)} }); const j = r.ok ? await r.json() : null; return j?.data?.question || null; } catch { return null; } finally { clearTimeout(timer); } })()`;
      const answer = await Promise.race([this.wc.executeJavaScript(script), new Promise(resolve => { timer = setTimeout(() => resolve(null), 6000); })]);
      if (!answer || !isLeetCode(this.url())) return null;
      return { content: typeof answer.content === "string" ? answer.content : "", tags: Array.isArray(answer.topicTags) ? answer.topicTags.filter(t => t && typeof t.name === "string").map(t => t.name) : [] };
    } catch { return null; }
    finally { clearTimeout(timer); }
  }

  /**
   * After a redo unlock, ask LeetCode to restore starter code.
   * Returns false when the reset control is not on the page.
   */
  async resetStarter() {
    if (!isLeetCode(this.url())) return false;
    try { return await this.wc.executeJavaScript(resetStarterScript()); }
    catch { return false; }
  }

  setCover(on) {
    this.coverOn = !!on;
    if (isLeetCode(this.url())) this.wc.executeJavaScript(coverScript(this.coverOn)).catch(() => {});
    return this.coverOn;
  }

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

/** Pick LeetCode's reset control from a list of buttons. Null when it is not there. */
function findResetControl(buttons) {
  const list = buttons || [];
  return list.find((b) => {
    const text = String(b.text || "").trim();
    const label = String(b.label || "");
    return /^(reset|reset code)$/i.test(text) || (/reset/i.test(label) && /code/i.test(label));
  }) || null;
}

function resetStarterScript() {
  return `(() => {
    const buttons = [...document.querySelectorAll("button")].map((el) => ({ el, text: el.innerText || "", label: el.getAttribute("aria-label") || "" }));
    const reset = buttons.find((b) => /^(reset|reset code)$/i.test(b.text.trim()) || (/reset/i.test(b.label) && /code/i.test(b.label)));
    if (!reset) return false;
    reset.el.click();
    setTimeout(() => {
      const confirm = [...document.querySelectorAll("button")].find((el) => /^(confirm|reset|yes)$/i.test((el.innerText || "").trim()) && el !== reset.el);
      if (confirm) confirm.click();
    }, 250);
    return true;
  })()`;
}

module.exports = { LeetCodeView, isLeetCode, HOME, coverScript, exactAccepted, trackSubmission, WATCH, findResetControl, resetStarterScript };
