// Session reminders: 10 minutes before, at the start and at the end of each of today's sessions.
// The Hub hands over today's remaining sessions; this schedules system notifications for them.
const { Notification, powerMonitor } = require("electron");

/** Next midnight in Asia/Kolkata, as a UTC millisecond timestamp. */
function nextIstMidnight(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const num = (type) => Number(parts.find((p) => p.type === type).value);
  const midnight = Date.UTC(num("year"), num("month") - 1, num("day")) - (5 * 60 + 30) * 60000;
  return now < midnight ? midnight : midnight + 24 * 60 * 60 * 1000;
}

class Reminders {
  constructor(appWin) {
    this.appWin = appWin; this.timers = []; this.midnight = null;
    this.armMidnight();
    try { powerMonitor.on("resume", () => this.refresh()); } catch {}
  }

  armMidnight() {
    clearTimeout(this.midnight);
    const delay = Math.max(1000, nextIstMidnight() - Date.now());
    this.midnight = setTimeout(() => { this.refresh(); this.armMidnight(); }, delay);
  }

  refresh() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.appWin.send("reminders-refresh");
  }

  set(items) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const now = Date.now();
    for (const it of items || []) {
      const at = (ms, kind, title, body) => {
        if (ms > now) this.timers.push(setTimeout(() => this.fire(kind, it.title, title, body), ms - now));
      };
      at(it.start - 10 * 60000, "soon", `${it.title} starts in 10 minutes`, it.topic);
      at(it.start, "start", `${it.title} session started`, `Planned: ${it.topic}`);
      at(it.end, "end", `${it.title} session complete`, it.next ? `${it.next} is next.` : "That was today's last session.");
    }
    return this.timers.length;
  }

  fire(kind, subject, title, body) {
    if (Notification.isSupported()) {
      const n = new Notification({ title, body, silent: false });
      n.on("click", () => { this.appWin.focusExisting(); this.appWin.openView("hub"); });
      n.show();
    }
    this.appWin.send("hub-reminder", { kind, title: subject, body: `${title}. ${body}` });
  }
}

module.exports = { Reminders, nextIstMidnight };
