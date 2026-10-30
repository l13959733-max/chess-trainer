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

## Repertoire

`data/*.pgn`, one file per opening family. Headers: `[Side "White"|"Black"]` = the side you learn,
`[Opening "…"]` = the chapter on the overview (order in `src/lib/chapters.ts`). 83 lines (31.10.2026):
Italian Game for both sides (incl. Petrov, Philidor, Two Knights, Evans, traps), Vienna Game and Bishop's Opening,
Scandinavian for White (vs 1...d5) and Black, replies to other first moves (French, Caro-Kann, Sicilian Alapin,
Pirc/Modern, Nimzowitsch), Caro-Kann for both sides, the Sicilian Dragon and anti-Sicilians for Black, the Smith-Morra and Wing Gambits for White, and the Queen's Gambit Declined / London for Black. `[Check "gambit"]` or `[Check "trap"]` allows up to 1.5 pawns for an intended sacrifice or trap setup.

`npm run check-lines` lets Stockfish (depth 16) check every move of the learner's side: no move may lose more than
0.6 pawns against the engine's best move, and it prints the evaluation at the end of each line. Run it after every
change to the PGN files (all 83 lines pass).

## Hoppy-Bot (play games)

`#/play`: games against a bot that plays like a human of a given rating. Stockfish rates every legal move
(MultiPV, depth 8, 10 from 1200), the bot then picks from the quality class a human of that rating plays:
best move / near-best / inaccuracy / mistake / blunder (lost winning chance < 3, 3–10, 10–30, ≥ 30 points) and how
often free material after the opponent's blunder is taken. These frequencies are **measured for 300–799** on 1,279
analysed rapid games of l0o2 (opponents' moves by their rating); above that they are **estimates** (`src/lib/bot.ts`).
Opening moves come from the repertoire (traps and moves the lines call mistakes excluded).

- **Rating**: the Hoppy-Bot rating starts at the player's chess.com rapid rating and moves like Elo after every
  rated game (K = 48 for the first 10 games, then 32). Rated = a full game without take-backs.
- **Safety check** (on by default): marks your pieces that can be taken for free or by a cheaper piece.
- **Play on**: from the end of any line (Learn and Drill). **Win it**: from positions of your games where you were
  clearly winning (≥ +3) before a blunder.
- After each game Stockfish (depth 12) looks for your blunders; they become puzzles like the chess.com ones.

## My weaknesses

`#/weaknesses`: every puzzle gets a category from the opponent's best answer (`src/lib/weakness.ts`): piece left
hanging, threat not seen, protection taken away, fork or pin not seen, checkmate allowed, free piece not taken,
checkmate missed, winning trick missed, other. Older puzzles get it once in the background (one engine look each).
Each category shows its rule and trains just those puzzles. **What's the threat?** (`#/threats`) shows the position
right after your mistake; you play the opponent and find the punishment (its own review schedule, `t:` keys).

## Trophies and today's cards

`#/trophies`: 32 trophies (lines, perfect lines, each chapter, puzzles, threats, streaks, levels, bot wins and
ratings), computed from stored progress. `#/daily`: everything due today – lines, puzzles, threats – mixed in one
round of at most 20 cards.

## Blunder trainer (step 4)

- **Analyse games** loads the games of this device's chess.com player (default `l0o2`; Settings → Chess.com account,
  or the link `#/player/<name>`), rapid + daily only, newest first. Games and puzzles are stored per player.
- Every position is evaluated by **Stockfish 19 lite** (single-threaded WASM, depth 14) in a Web Worker.
  The engine files are copied from `node_modules/stockfish` into `public/stockfish/` by `scripts/copy-stockfish.mjs`
  before `dev`/`build` (not committed). Stockfish is GPL-3.0; its licence ships as `stockfish/COPYING.txt`.
- A move of mine is a **blunder** when it loses more than 2 pawns (scores clamped to ±10 pawns, so swings inside a
  decided game don't count) or when it misses a mate in 3 or less. Each blunder becomes a puzzle: “Find a better move”
  from the position before my move. The engine's move solves it, and so does any move within 0.5 pawns of it
  (both moves re-checked live at depth 14 from a cleared engine hash, so the verdict is repeatable).
- **Explanations (free, no AI service):** “Why is … bad?” lets Stockfish answer the game move and turns the line into
  sentences from proven facts: what the reply takes, forks, pins, skewers, single attacks, trapped pieces, trades,
  mates and the material balance (`src/lib/explain.ts`). “Why … is better” does the same for the best move. Both
  lines can be replayed on the board move by move.
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

**Lu's voice ships with the app (Lu's decision, 29.10.2026):** `public/voice/` holds every sentence the app reads
for the built-in repertoire in Lu's cloned voice (m4a) plus `manifest.json`. Everyone who opens the app hears his voice,
no Mac needed. These files are public. After changing the repertoire, start the voice changer on the Mac and run
`npm run voice` (only new sentences are generated), then commit `public/voice`.

**Your voice as the standard voice:** Settings → “Save my voice on this phone” downloads every explanation once
in the cloned voice (m4a, IndexedDB store `voiceClips`). From then on the app reads in Lu's voice even when the Mac
is off. Order when reading: saved clip → Mac voice (saved on the way) → phone voice only for sentences that were
never saved. The Mac's voice changer caches finished sentences, so a second device downloads them quickly.

Explanations are read aloud automatically as soon as they appear (queued, so nothing is cut off); turn this off in
Settings. Reading stops when you leave a screen. The first tap anywhere unlocks audio on iOS.

The voice server only accepts browser requests from this app's address (CORS list `CORS_ORIGINS` in `app_clone.py`).
A new sentence takes about 10–20 s on the Mac CPU; the app requests one sentence at a time and starts as soon as an
explanation has been on screen for a second. Repeated sentences come from the server cache instantly.

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
