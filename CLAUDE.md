# Chess Trainer – Projektspezifikation

> **Startbefehl:** Wenn Lu „Chess Trainer" schreibt, lies diese Datei, prüfe welcher
> Schritt unter „Reihenfolge" als Nächstes offen ist (anhand von Code + Git-Log),
> und baue ihn ohne Rückfragen, außer du bist wirklich blockiert. Danach: committen,
> deployen, kurz sagen was er testen soll.

## Ziel
Persönliche Trainings-App für Lu (Chess.com: **l0o2**, Rapid ~574, Puzzles ~604).
Langfristiges Ziel: 2000 Elo. Die App soll spielerisch Eröffnungen beibringen,
aus eigenen Fehlern lernen lassen und **jeden Fehler verständlich erklären**.
**Sprache: App komplett Englisch** (UI, Repertoire-Kommentare, Erklärungen, Notation N/B/R/Q) – Lus Entscheidung vom 29.10.2026.
Hauptnutzung: am Handy.

## Tech-Stack
- Vite + React + TypeScript, mobile-first, als PWA installierbar
- `chess.js` (Regeln, PGN), `react-chessboard` (Brett)
- `stockfish` (WASM) im Web Worker für Analyse
- IndexedDB (z. B. via `idb`) für alle lokalen Daten
- Deploy: GitHub Pages (GitHub Action)
- Erklärungen: Claude API über einen **Cloudflare Worker als Proxy** (`/worker`).
  Der API-Key liegt NUR als Worker-Secret, niemals im Frontend.

## Modul 1 – Eröffnungs-Trainer (zuerst bauen)
- Repertoire aus `data/*.pgn` laden (Start: `data/repertoire_italian.pgn`).
  Header `[Side "White"|"Black"]` = Seite, die ich lerne. `{Kommentare}` = Erklärungen.
- **Lernen-Modus:** Linie Zug für Zug, Erklärung zu jedem Zug anzeigen, Pfeile für Ideen.
- **Drill-Modus:** Ich spiele meine Seite, App spielt die Gegnerzüge.
  Falscher Zug → rot markieren, richtigen Zug + Erklärung zeigen.
- **Spaced Repetition (SM-2)** pro Linie; Startseite zeigt fällige Linien.
- Eigene PGNs importierbar (Datei oder einfügen).
- Später: Repertoire für Schwarz (Caro-Kann, Skandinavisch, Damengambit abgelehnt, Albin).

## Modul 2 – Blunder-Trainer
- Partien laden: `https://api.chess.com/pub/player/l0o2/games/archives`, dann Monatsarchive.
- Nur Rapid + Daily analysieren. Stockfish Tiefe ~14, im Hintergrund, mit Fortschrittsanzeige.
- Zug mit Eval-Verlust > 2 Bauern (bzw. verpasstes Matt) = Blunder → wird zum Puzzle
  „Finde den besseren Zug" (Stellung vor meinem Zug).
- Puzzles ebenfalls in Spaced Repetition.
- Bereits analysierte Partien merken, nur neue analysieren.

## Modul 3 – Erklärungen (das Herzstück)
- Zu jedem Blunder und jedem Drill-Fehler: Anfrage an den Worker mit
  FEN, gespieltem Zug, Stockfish-Bestzug, Hauptvariante (5 Halbzüge), Eval vorher/nachher.
- Systemprompt für Claude: Antwort auf Englisch, max. 4 Sätze, einfach für ~600 Elo,
  KEINE Engine-Zahlen. Inhalt: (1) was übersehen wurde, (2) warum der Bestzug besser ist,
  (3) welches allgemeine Prinzip dahintersteckt.
- Antwort enthält zusätzlich ein Prinzip-Tag (JSON): `haengende_figur`, `gabel`,
  `fesselung`, `spiess`, `koenigssicherheit`, `entwicklung`, `zentrum`, `endspiel`, `sonstiges`.
- „Frag nach"-Button ("Ask"): freie Frage zur aktuellen Stellung („Why not Nxe5?").
- Erklärungen in IndexedDB cachen (Key = FEN + Zug).
- Seite „Meine Schwächen": Tags nach Häufigkeit, je mit kurzer Regel und Beispielen aus meinen Partien.

## Gamification
- XP pro gelöster Aufgabe, tägliche Streak, Level, Tagesziel
  (Standard: 10 Eröffnungslinien + 10 Blunder-Puzzles).
- Kurze Erfolgsanimation, Streak-Anzeige auf der Startseite.

## UI
- Englisch, dunkles Theme, große Touch-Ziele, Brett füllt Bildschirmbreite.
- Startseite: Tagesziel, Streak, fällige Linien, fällige Puzzles, „Meine Schwächen".

## Reihenfolge
1. Projekt-Setup, PWA, GitHub-Pages-Deploy
2. Modul 1 komplett (Lernen, Drill, SRS) mit dem Italienisch-Repertoire
3. Gamification-Grundgerüst
4. Modul 2
5. Worker + Modul 3
Nach jedem Schritt: committen, deployen, kurz zusammenfassen was ich testen soll.

## Regeln für Claude Code
- Kleine, funktionierende Schritte; nach jedem Schritt muss die App laufen.
- Schachlogik (Zuglegalität, PGN-Parsing) mit Tests absichern (Vitest).
- README mit Setup, Deploy und Worker-Einrichtung (Secret setzen) pflegen.
