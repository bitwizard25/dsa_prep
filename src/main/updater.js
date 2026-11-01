// GitHub Releases updates. Public repo only: a token is never read or sent.
const fs = require("fs");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { readUpdatesFile, resolveFeed } = require("./update-policy");
const { createUpdateController } = require("./update-controller");

function startUpdater(opts) {
  const file = readUpdatesFile(path.join(opts.userData, "updates.json"), fs);
  const feed = resolveFeed({ envRepo: process.env.DSA_UPDATES_REPO, file });
  return createUpdateController({
    autoUpdater,
    isPackaged: opts.isPackaged,
    isOnline: opts.isOnline,
    feed,
    flush: opts.flush || (() => {}),
    onNotify: opts.onNotify,
  });
}

module.exports = { startUpdater };
