// Session reminders: 10 minutes before, at the start and at the end of each of today's sessions.
// The Hub hands over today's remaining sessions; this schedules system notifications for them.
const { Notification } = require("electron");

class Reminders {
  constructor(appWin) { this.appWin = appWin; this.timers = []; }

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

module.exports = { Reminders };
