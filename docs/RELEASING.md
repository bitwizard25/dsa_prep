# Releasing

The installed Windows app updates itself from GitHub Releases. One manual install of a build that contains the updater is required. After that, a published release is downloaded in the background and applied the next time the app quits.

## Publish a version

1. Bump `version` in `package.json` to the new number, for example `2.4.0`. Commit that change on the branch you want to ship.
2. Tag that commit with the same number and a leading `v`:

```
git tag v2.4.0
git push origin v2.4.0
```

3. The Release workflow (`.github/workflows/release.yml`) runs on `windows-latest`. It builds the Hub, writes `src/build-info.json` with the short commit and the build time, then `electron-builder` builds the NSIS installer and uploads three files to a GitHub Release for that tag:

- `dsa_prep_setup_<version>.exe`
- `dsa_prep_setup_<version>.exe.blockmap`
- `latest.yml`

The workflow uses the built-in `GITHUB_TOKEN`. It does not need any other secret. The release is a normal public release, not a draft and not a prerelease. Drafts are invisible to the app.

The installer is built with `differentialPackage: "store-asar"`, so the blockmap can skip unchanged parts of the app. The installer file is larger. The download on a later update is smaller.

## What the app does

On a packaged build it checks GitHub about 15 seconds after startup, then about every 4 hours, and only when the computer is online. Offline, or any update error, is ignored. The app keeps working from the local data.

Settings in the Hub and in practice has an About section: the version from the app, the commit and build date stamped above, the last check, and the updater state (up to date, checking, downloading with a percent, update ready, offline, or error). The same version sits in the top bar. Check for updates asks immediately. A development run with no stamp says Development build and does not contact GitHub.

A new version downloads in the background. When it is ready, the Hub shows "Update ready" with "Restart now?" and Windows gets one quiet notification. The tray menu has the same action when the tray is on. Restart now quits, installs with no installer window, and opens the app again.

Quitting from the tray, or closing the window when the tray is off, also installs the download silently and does not reopen the app. Closing the window into the tray does not install.

A Think-first gate, a running focus block, a Hub study session, or a quiz in progress holds the restart. The download still finishes. Restart now waits, and the install happens on the next real quit after saves are written. Saves are flushed before every quit and before Restart now.

Notes and progress live in `%APPDATA%\dsa-practice`, which is outside the install folder. An update replaces the program files and leaves that folder in place.

## Another public releases repo

`bitwizard25/dsa_prep` is the default. To publish installers from a different public repository, either set the environment variable `DSA_UPDATES_REPO` to `owner/repo` before launching, or write `%APPDATA%\dsa-practice\updates.json`:

```json
{ "owner": "some-org", "repo": "dsa-prep-releases" }
```

The file may contain only `owner` and `repo`. A token in that file is ignored. The app cannot read a private repository.

## Code signing

This project has no signing certificate. Windows SmartScreen may warn the first time someone runs the installer. Updates still install. When you have a certificate, sign the workflow build and set the publisher name in the updater config so signature checks can be turned on.
