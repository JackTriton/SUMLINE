# SUMLINE v1.4

A standalone number puzzle built with HTML, CSS, and JavaScript. Choose the correct cells to bring every row and column sum to zero. You have three lives; locked cells are already selected hints.

## Run locally

Install Node.js 24 or later. Open the project folder in VS Code, then run:

```sh
npm run dev
```

Open http://localhost:8000/. The frontend needs no package installation. To test from a phone on the same Wi-Fi network:

```sh
npm run dev -- --host 0.0.0.0
```

Open `http://YOUR-COMPUTER-LAN-IP:8000/` on your phone. Stop the server with Ctrl+C. Restart it after editing source files.

## Language

Use the language menu at the top of the page or **Settings → Language**. Choose **日本語**, **English**, or **Auto (device language)**. Auto uses Japanese when your browser's first preferred language is Japanese, and English otherwise. Your choice is saved on this browser for this site.

Language changes preserve your puzzle, progress, score, and timer state. Names and seeds remain as entered. Daily puzzles, tournament schedules, and leaderboard periods always use **Japan Standard Time (JST, UTC+9)**.

## Controls

- Desktop: click once to highlight, then click the same cell again to confirm. There is no time limit between these clicks. One-click confirmation is available in Settings.
- Desktop flags: Shift-click, right-click, or press F on a focused cell. Remove a flag before confirming that cell.
- Touch: tap once to toggle a flag; double-tap to confirm a cell, even when flagged.
- Press and hold to highlight. Releasing does not confirm.
- Keyboard: arrow keys to move, Enter or Space to click, Esc to clear a highlight.

## Modes and records

Normal play, replays, three shared Daily boards, and Custom puzzles with size, seed, and locked-cell count work locally. Boards are checked for a unique solution before play. Settings include timers, music, sound effects, visual quality, and custom color skins.

Shared tournaments and online leaderboards require the separate API included in `backend/`. GitHub Pages serves the static game; it does not run that backend. Score sharing is off by default. Custom puzzles, replays, and attempts that go offline are excluded from global online records. Offline scores are never queued for later submission.

Leaderboards have all-time, monthly, weekly, and daily periods. They rank by boards cleared, then total elapsed time, then score. Weeks start on Monday; all boundaries use JST.

## GitHub Pages

1. Put the contents of this project at your repository root, including `.github/`, `scripts/`, and `tests/`.
2. In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` or `master`. Adjust `on.push.branches` in `.github/workflows/pages.yml` for other branch names.
4. Wait for **Publish SUMLINE to GitHub Pages** to finish. Its deployment result provides the site URL.

The workflow tests the project, builds `pages-dist/`, and publishes only that directory. Repository subpaths such as `/SUMLINE/` are supported. It uses Node.js 24, Ubuntu 24.04, and updated Pages actions.

For an existing shared API, preserve your `pages.config.json` or the `SUMLINE_API_BASE` repository variable when updating. No backend or database changes are required for the language update. Backend deployment instructions are in `docs/GITHUB_PAGES.md`.

```sh
npm test
npm run build:pages
```

Translations are bundled in `public/messages.js`; language selection and message formatting live in `public/i18n.js`. No external translation service is used.
