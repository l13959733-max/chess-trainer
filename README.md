# Chess Trainer

Personal chess training app (PWA, mobile-first) with a bright, kid-friendly look and a knight mascot called Hoppy. Spec and build order: [CLAUDE.md](CLAUDE.md).

Live: https://l13959733-max.github.io/chess-trainer/

## Setup

```bash
npm install
npm run dev      # development, http://localhost:5173
npm test         # Vitest (also checks every line in data/*.pgn for legal moves)
npm run build    # production build into dist/
```

Regenerate the app icons: `npm run icons` (writes `public/pwa-*.png`).

## Features

- **Repertoire overview**: every line with its status (New / Due / in X days)
- **Learn**: step through a line move by move with the explanation from the PGN comment.
  The blue arrow shows the next move; `[%cal Ge2e4,Rd1h5]` in comments draws arrows (G/R/Y/B = green/red/yellow/blue)
- **Drill**: play your side (drag or tap a piece, then its square), the app plays the opponent.
  Wrong move → red squares, a green arrow to the right move, and its explanation
- **Spaced repetition (SM-2)** per line: flawless → the interval grows, 2+ mistakes → due again tomorrow
- **PGN import** (file or paste), stored in the browser's IndexedDB
- **Gamification**: XP (drill 10 XP, +10 flawless / +5 with one mistake, learning a line 5 XP),
  levels at 0 / 100 / 300 / 600 … XP, daily streak (a day counts once you finish a drill),
  daily goal (default 10 lines + 10 puzzles; puzzles count from step 4), short success animation

All progress and imports live only in the browser (IndexedDB `chess-trainer`).

## Blunder trainer (step 4)

- **Analyse games** loads Lu's games from the chess.com public API (`l0o2`, rapid + daily only), newest first.
- Every position is evaluated by **Stockfish 19 lite** (single-threaded WASM, depth 14) in a Web Worker.
  The engine files are copied from `node_modules/stockfish` into `public/stockfish/` by `scripts/copy-stockfish.mjs`
  before `dev`/`build` (not committed). Stockfish is GPL-3.0; its licence ships as `stockfish/COPYING.txt`.
- A move of mine is a **blunder** when it loses more than 2 pawns (scores clamped to ±10 pawns, so swings inside a
  decided game don't count) or when it misses a mate in 3 or less. Each blunder becomes a puzzle: “Find a better move”
  from the position before my move. The engine's move solves it, and so does any move within 0.5 pawns of it
  (both moves re-checked live at depth 14 from a cleared engine hash, so the verdict is repeatable).
- Puzzles use the same SM-2 schedule as lines; a session is all due puzzles plus up to 10 new ones.
- Finished games are stored (IndexedDB `games`), so the next run only analyses new games. Pausing keeps everything
  except the game in progress. Measured on a Mac: about 6 s per game; a phone is slower.

## Read aloud in your own voice

Explanations have a **Listen** button. It uses the cloned voice from the voice changer on the Mac
(`~/Projects/voice-changer`, XTTS) and falls back to the phone's built-in voice when the Mac is not reachable.

1. Mac: double-click `~/Projects/voice-changer/Chess-Voice.command`. It starts the voice changer and the tunnel,
   keeps the Mac awake, copies the `https://….trycloudflare.com` address and prints a voice link.
2. Phone: App → Settings → paste the address → Save. (Or open the voice link `#/voice/<address>` – handy on Android
   or in a browser; on iPhone a home-screen app has its own storage, so paste the address inside the app.)

Explanations are read aloud automatically as soon as they appear (queued, so nothing is cut off); turn this off in
Settings. Reading stops when you leave a screen. The first tap anywhere unlocks audio on iOS.

The voice server only accepts browser requests from this app's address (CORS list `CORS_ORIGINS` in `app_clone.py`).
A new sentence takes about 10–20 s on the Mac CPU; the app requests one sentence at a time and starts as soon as an
explanation has been on screen for a second. Repeated sentences come from the server cache instantly.
No audio with the cloned voice is ever stored in this (public) repo.

## Sound and vibration

Moves click like wooden pieces (synthesised with Web Audio, no audio files), captures sound heavier, mistakes get a
soft low tone and finished lines/puzzles a short chime. Vibration uses the Vibration API on Android and the native
switch haptic on iOS 18+. Both can be turned off in Settings (stored per device).

## Repertoire files

Lines are PGN files in `data/`. Per game:

- `[Side "White"]` or `[Side "Black"]` = the side you are learning
- `{comment}` after a move = the explanation the app shows

Add a file → `npm test` checks that every move is legal.

## Deploy (GitHub Pages)

Every push to `main` builds, tests and publishes via `.github/workflows/deploy.yml`.

One-time setup: repo → Settings → Pages → Source: **GitHub Actions**.
GitHub Pages needs a **public** repo or GitHub Pro (for private repos).

Test the Pages build locally:

```bash
BASE_PATH=/chess-trainer/ npm run build
BASE_PATH=/chess-trainer/ npx vite preview   # http://localhost:4173/chess-trainer/
```

## Install on a phone

Open the site → “Add to Home Screen” (iOS: Share menu, Android: menu ⋮ → “Install app”).

## Explanation worker (step 5)

Comes with module 3: a Cloudflare Worker in `/worker` that proxies the Claude API.
The API key is set only as a worker secret (`wrangler secret put ANTHROPIC_API_KEY`), never in the frontend.
