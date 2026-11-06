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
Eine spanische Version wurde am 03.11.2026 versehentlich gebaut (Auftrag war für ein anderes Projekt) und sofort zurückgenommen (Commit beb5511, Revert danach). Nicht wieder einbauen, außer Lu verlangt es ausdrücklich für Hoppy.
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
- Englisch, große Touch-Ziele, Brett füllt Bildschirmbreite.
- **Design: kinderfreundlich, hell, im Stil von Lern-Apps wie Duolingo** (Lus Entscheidung 29.10.2026, auch um seinen Sohn
  für Schach zu begeistern): Maskottchen „Hoppy" (Springer-Pferdchen, `src/components/Mascot.tsx`), Lernpfad auf der
  Startseite, dicke drückbare Knöpfe, Schrift Nunito, Styles in `src/theme-kids.css`. Keine fremden Marken/Figuren.
- Sound (synthetisiertes Klacken) und Vibration bei Zügen, abschaltbar in Settings.
- Startseite: Tagesziel, Streak, fällige Linien, fällige Puzzles, „Meine Schwächen".

## Ausbau 30.10.2026 (Lus Auftrag nach der Gesamtanalyse aller Partien)
- Repertoire stark erweitert, nach Kapiteln (`[Opening]`-Header): Italienisch Weiß+Schwarz, Wiener, Läuferspiel,
  Skandinavisch Weiß+Schwarz, andere Antworten auf 1.e4, Damengambit abgelehnt. **Jede neue Linie mit
  `npm run check-lines` prüfen** (kein Lern-Zug > 0,6 Bauern schlechter als Stockfish). Nichts Bestehendes löschen.
- Hoppy-Bot (`src/lib/bot.ts`): Fehlerraten pro Wertung an echten Partien gemessen (300–799), darüber geschätzt.
  Adaptive Bot-Wertung, Safety Check, Play on nach Linien, „Win it" aus Gewinnstellungen, Partie-Fehler → Puzzles.
- „My weaknesses" + „What's the threat?" (Hauptfehler laut Analyse: Gegnerdrohung nicht geprüft).
- Trophäen + „Today's cards" (alles Fällige gemischt).

## Watch: zuschauen + füreinander weiterspielen (Lus Wunsch 01.11.2026)
- `src/lib/live.ts` + `src/screens/Watch.tsx`, Route `#/watch`. Nur Partien gegen Hoppy-Bot (`#/play`), nicht Drill/Puzzles, nicht chess.com.
- Kein Server: Spielstand läuft über zwei öffentliche MQTT-Broker (HiveMQ, EMQX), AES-GCM-verschlüsselt mit Schlüssel aus dem Einladungscode. Ohne Einladung keine Verbindung.
- `driver` = Gerät, das gerade zieht und den Bot rechnet. Übernehmen = Stand mit höherer `rev` veröffentlichen; ganzer Spielstand steckt in der Nachricht, darum geht es auch, wenn der andere weg ist.
- Seit 06.11.: auch Eröffnungs-Übungen (Drill) live zuschauen, nur zuschauen (kein Übernehmen). Eigener Kanal `…/d/<Gerät>` neben den Partien `…/g/<Gerät>`, damit eine offene Bot-Partie erhalten bleibt. Drill.tsx meldet bei jeder Änderung + alle 30 s, beim Verlassen leer.
- Seit 06.11. abends: **zusammen üben** – wer will, zieht in der Linie des anderen (`…/m/<Besitzer>`, Besitzer-Handy prüft den Zug wie einen eigenen). **Online-Anzeige** über `…/p/<Gerät>` (alle 30 s, beim Verstecken leer, sonst Last Will des Brokers).
- Guide: `story` (Geschichte, aufklappbar) und `rewards` (ein Fakt nach jeder geschafften Linie des Kapitels, reihum). Nur belegte Fakten.
- Geholfene Partie: keine Wertung, Züge des Helfers (`helped`) werden nicht zu Puzzles des Besitzers; Helfer bekommt kein XP.

## 1.d4-Repertoire + Eröffnungs-Karte (Lus Wunsch 06.11.2026)
- `data/d4_white.pgn`: gegen 1...d5 alle drei Systeme (London 2.Bf4, Levitsky 2.Bg5, Damengambit 2.c4 – Lus Wahl: „alle 3“), gegen Holländisch/1...c5/Englund eigene Linien, gegen 1...e6/c6/d6/g6 → 2.e4 (Übergang ins 1.e4-Repertoire).
- `#/map` (`src/screens/OpeningMap.tsx`, Baum aus den Linien in `src/lib/tree.ts`): „Schwarz spielt X → du spielst Y“, Practise je Ast, „Surprise me“ (`#/surprise/<w|b>`, zufällige Linie).
- Prozente: `src/lib/opening-stats.json`, gefüllt von `scripts/fetch-opening-stats.mjs` (Lichess-Explorer, braucht Token – NIE ins Repo; Datei `~/.config/hoppy/lichess-token`). Ohne Daten zeigt die Karte keine Prozente.
- Nach einer Linie scrollt die Übersicht zurück zu dieser Linie (`src/lib/returnTo.ts`).

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
