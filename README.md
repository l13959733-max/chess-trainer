# Chess Trainer

Persönliche Schach-Trainings-App (PWA, Deutsch, mobile-first). Spezifikation und Bau-Reihenfolge: [CLAUDE.md](CLAUDE.md).

## Setup

```bash
npm install
npm run dev      # Entwicklung, http://localhost:5173
npm test         # Vitest (u. a. prüft jede Linie in data/*.pgn auf Legalität)
npm run build    # Produktions-Build nach dist/
```

App-Icons neu erzeugen: `npm run icons` (schreibt `public/pwa-*.png`).

## Repertoire

Linien liegen als PGN in `data/`. Pro Partie:

- `[Side "White"]` oder `[Side "Black"]` = die Seite, die gelernt wird
- `{Kommentar}` nach einem Zug = Erklärung, die die App anzeigt

Neue Datei hinzufügen → `npm test` prüft automatisch, dass alle Züge legal sind.

## Deploy (GitHub Pages)

Jeder Push auf `main` baut, testet und veröffentlicht über `.github/workflows/deploy.yml`.
Die App liegt dann unter `https://<github-user>.github.io/chess-trainer/`.

Einmalig: Repo → Settings → Pages → Source: **GitHub Actions**.
GitHub Pages braucht entweder ein **öffentliches** Repo oder GitHub Pro (bei privaten Repos).

Lokal den Pages-Build testen:

```bash
BASE_PATH=/chess-trainer/ npm run build
BASE_PATH=/chess-trainer/ npx vite preview   # http://localhost:4173/chess-trainer/
```

## Am Handy installieren

Seite im Browser öffnen → „Zum Home-Bildschirm" (iOS: Teilen-Menü, Android: Menü ⋮ → „App installieren").

## Worker für Erklärungen (Schritt 5)

Kommt mit Modul 3: ein Cloudflare Worker in `/worker` als Proxy zur Claude API.
Der API-Key wird nur als Worker-Secret gesetzt (`wrangler secret put ANTHROPIC_API_KEY`), nie im Frontend.
