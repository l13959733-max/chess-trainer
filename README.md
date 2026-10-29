# Chess Trainer

Personal chess training app (PWA, mobile-first). Spec and build order: [CLAUDE.md](CLAUDE.md).

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

All progress and imports live only in the browser (IndexedDB `chess-trainer`).

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
