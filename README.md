# DSA Practice 2.2: Prep Hub + Practice

Interview preparation hub (Prep) plus the DSA practice app (Practice), in one desktop app. No AI, no API keys: plans and recommendations come from rules and curated data.

Personal LeetCode practice app. Pick a company, set your hours, and it builds a day-by-day plan.
LeetCode runs on the right, your plan, timer and progress on the left. Everything stays on your PC.

## Run / build
Requires Node.js 22.12 or newer and npm. Install both the desktop and Hub dependencies:

    npm ci
    npm ci --prefix hub-src
    npm run build:hub     # rebuild after editing hub-src/
    npm start             # run from source
    npm run dist:win      # Windows installer (build on Windows, or Linux with Wine)
    npm run dist:linux    # Linux AppImage

## Checks

    npm run check         # regression tests and Hub TypeScript check
    npm run build:hub     # production Hub build
    npm run smoke         # hidden Electron windows, temporary data; requires a desktop session
    npm audit
    npm audit --prefix hub-src

GitHub Actions runs tests, type checks and the production Hub build on Windows and Linux.
The Electron smoke check loads both bundled pages with the sandboxed preload and verifies IPC saves
in a temporary profile. It does not sign in to LeetCode or test browser cookie import.

## Reliability and security improvements

- Deadline estimates use the actual problem-packing engine: three Hard problems over two days now
  require two hours per day, rather than an average of 1.5 hours that would miss the deadline.
- Count-based plans reject fractional problem counts instead of duplicating or skipping problems.
- JSON saves flush to disk before replacement and retain the previous valid save as a `.json.bak` file.
  If a primary file is missing or invalid JSON, the app reads its backup automatically. Backups live
  beside the primary files and contain the same personal data; erase both copies when clearing data manually.
- Privileged IPC checks both the sender and main frame against the two bundled app pages.
- LeetCode navigation trusts HTTPS only; popup links launch external browsers only for HTTP(S) URLs.
- Opening from the tray or a reminder shows a hidden window before focusing it.
- Electron, electron-builder and Vite are upgraded, and both dependency trees have lockfiles.

## Prep Hub (2.0)
The app opens on the Hub. Practice (the DSA app below) is one click away and works exactly as in 1.4.
- Plan Mode: role, company, hours a day, ready-by date; "Customize plan" for level, days a week, start time, subject weights.
- Planner: priority = role weight x company adjustment x (0.5 + need); subjects under 10% share a rotating slot;
  the last 20% of the plan is Interview mode; short plans leave out advanced topics first and say so.
- Today: current session, why, what's next, on-track status, today's timeline, progress, next milestone.
- Roadmap (phases, milestones), Subjects (topics, mastery), Practice, Progress (readiness estimate), Settings.
- Sessions: learn, practise, review checklist with a "Start here" video; DSA sessions open the practice app.
- Reminders: 10 minutes before, at the start and at the end of each session; optional tray icon.
- Curated library: 112 videos mapped to 36 topics plus a full course per subject (content/youtube/*.csv,
  built by tools/build-videos.py). Videos open as a YouTube search for the exact title, since the data has no per-video links.

Hub source: hub-src/ (Preact + TypeScript + Vite), built into src/hub/ with `npm run build:hub`.
Hub data: hub.json in the app data folder. The practice app's state.json is only read, never written, by the Hub.

## Architecture
Two layers that only talk through `preload/index.js` (a fixed list of functions).

    src/
      main/                    Electron main process (Node)
        index.js               app lifecycle, single instance
        window.js              window, layouts (onboarding / workspace), window memory, shortcuts
        leetcode-view.js       LeetCode panel: session, navigation rules, login detection, auth check
        browser-login.js       login through real Chrome/Edge (Cloudflare blocks app browsers)
        cdp.js                 tiny Chrome DevTools Protocol client (local only)
        ipc.js                 every request the UI may make
        store.js               atomic JSON files in the app data folder
      preload/index.js         the safe bridge (window.api)
      renderer/                UI (no Node access)
        app.js                 controller: screen state, actions, events, timer loop
        core/                  logic, no HTML
          problems.js          dataset access + per-company selection engine, custom import
          plan.js              schedule engine (pure functions)
          practice.js          today list, leftovers, next problem, marking, streaks, stats
          timer.js             pomodoro
          state.js             state shape, saving, migration from 0.x
          dates.js
        screens/               HTML for each screen
          onboarding.js        Connect, Target, Patterns, Schedule
          workspace.js         sidebar: timer, tracker, tabs, collapsed mode
        ui/                    shared components and icons
        data/dataset.js        generated: 3,004 problems, 14 patterns, 35 companies
        styles/app.css         Obsidian Gold theme
        ui/silk.js             procedural black-silk + gold ribbon texture (SVG, generated at startup)
        fonts/                 Cormorant Garamond + Manrope (OFL)

## Practice loop (1.3)
- One-tap Start: opens your next problem and starts the focus timer (Ctrl+Alt+P).
- Focus panel: during a block you see only the current problem, minutes alone (30-minute guide) and what's next.
- Early-solution warning: opening the editorial or solutions before 30 minutes shows a warning; the problem then counts as Help.
- Accepted detection: an Accepted result on LeetCode brings up one-tap marking, with Help suggested if you opened the solution.
- Spaced redo: problems marked Help come back after 3, 10 and 30 days, from a blank editor.
- Re-plan: leftovers from earlier days move forward from today instead of piling up; solved work is kept.

## Managing the plan (1.4)
Click the plan name in the header (e.g. AMAZON) for every plan action; the same actions are in the Plan tab and Settings.
- Edit companies & patterns: back into the plan builder; solved problems are kept.
- Adjust hours & days: straight to the schedule step; same problems, new schedule.
- Re-plan from today: move leftovers forward.
- Start a new plan: pick everything again; solved history, streak, notes and redos stay.
- Reset this plan's progress: clears this plan's marks and restarts it from today.
- Erase everything (Settings): clears all data except the LeetCode login.
Every reset asks first and lists exactly what is kept and what is removed.

## Plan math
Each problem costs time including review: Easy 20 min, Medium 40, Hard 60.
Days are filled up to your hours per day, skipping non-study days.
"Finish by date" mode works out the hours per day needed, rounded up so the plan really ends by that date.

## Company data
`src/renderer/data/dataset.js` is generated by `tools/build-data.js` from three public GitHub datasets:
- liquidslr/leetcode-company-wise-problems: LeetCode company tags with frequency and recency (June 2025), 35 companies included
- doocs/leetcode: problem numbers and Premium markers
- zerotrac/leetcode_problem_rating: contest difficulty ratings

Each problem is put into one of 14 patterns from its LeetCode topic tags (most specific tag wins).
Pick 1 to 3 companies. Every pattern gets 20, 30 or 40 problems: problems asked by more of your companies first,
then higher average frequency, plus a bonus if asked in the last 3 or 6 months. Gaps are filled with the most asked
problems across all companies ("Core").
Several companies (up to 3): each problem's score is the average of the companies' frequencies (0 where a company
doesn't ask it), so problems frequent everywhere win. The set builder shows, per company, how much of its own
most-asked list made it into the plan, and flags companies with few reported problems.
Mix per pattern: about 25% easy, 55% medium, 20% hard, ordered easy to hard. Premium problems are hidden unless enabled.

Regenerate:
    node tools/build-data.js <leetcode-company-wise-problems dir> <doocs README_EN.md> <zerotrac data.json>

## Data
- `state.json`: plan + progress. `window.json`: window size, last problem, browser identity.
- Windows: `%APPDATA%\dsa-practice\`, Linux: `~/.config/dsa-practice/`
