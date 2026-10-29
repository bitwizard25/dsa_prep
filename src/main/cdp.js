// Minimal Chrome DevTools Protocol helpers (local machine only).
const http = require("http");
const WebSocket = require("ws");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(port, path) {
  return new Promise((res, rej) => {
    const req = http.get({ host: "127.0.0.1", port, path, timeout: 4000 }, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    });
    req.on("error", rej);
    req.on("timeout", () => req.destroy(new Error("timeout")));
  });
}

function call(wsUrl, method, params = {}) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(wsUrl);
    const t = setTimeout(() => { ws.terminate(); rej(new Error("timeout")); }, 6000);
    ws.on("open", () => ws.send(JSON.stringify({ id: 1, method, params })));
    ws.on("message", (m) => {
      const j = JSON.parse(m.toString());
      if (j.id !== 1) return;
      clearTimeout(t); ws.close();
      j.error ? rej(new Error(j.error.message)) : res(j.result);
    });
    ws.on("error", (e) => { clearTimeout(t); rej(e); });
  });
}

module.exports = { wait, getJson, call };
