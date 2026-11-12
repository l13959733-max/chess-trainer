# Chess Trainer – Projektspezifikation

> **START (für jede neue Sitzung, auch für Johanna):** Die offene Arbeit steht in **`BAUPLAN.md`**.
> Begrüße kurz, nenne den ersten offenen Punkt (`[ ]`) aus `BAUPLAN.md` und frage nur: „Soll ich
> Punkt N bauen? (OK / alles)“. Bei OK, „los“, „weiter“ oder `/weiterbauen`: bauen nach den Regeln in
> `BAUPLAN.md`, ohne weitere Rückfragen. Bei „alles“: alle offenen Punkte nacheinander.
> Arbeit immer auf Branch `preview`; live (`main`) erst nach „übernehmen“.
>
> Alter Startbefehl: Wenn Lu „Chess Trainer" schreibt, gilt dasselbe.

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
- Startseite „Your path“ hat zwei Reiter (Lus Idee): **Learn openings** (Kapitel) und **What to play when?** (`WhatWhen` in `src/screens/OpeningMap.tsx`, Baum aus `src/lib/tree.ts`; auch als `#/map`). Gleiches Duolingo-Design wie die Kapitel (Lus Vorgabe): Kapitel = Antwort der Gegenseite, darin „You play …“ + Pfad mit `PathStep` (Learn/Play). „Surprise me“ (`#/surprise/<w|b>`) nur mit schon gespielten Linien.
- Prozente: `src/lib/opening-stats.json`, gefüllt von `scripts/fetch-opening-stats.mjs` (Lichess-Explorer, braucht Token – NIE ins Repo; Datei `~/.config/hoppy/lichess-token`). Ohne Daten zeigt die Karte keine Prozente.
- Nach einer Linie scrollt die Übersicht zurück zu dieser Linie (`src/lib/returnTo.ts`).

## King of Chess (Lus Konzept, ab 07.11.2026)
- **Seit 09.11. (Vorschau): Startseite `#/` = die gemalte Karte, aufgeräumt (keine Nebelwolken/Jahres-Plaketten, Nummern-Siegel, `RoadLines`), auch unter `#/world`. Schnellreise `#/road` = Städte als Liste (`KingRoad`)** (BAUPLAN 8, 24). Klicktests öffnen die Karte über `#/world`.
- Ursprünglich war die Startseite (`#/`) eine Weltkarte: Prinz **Liam** aus Kannauj reitet mit seinem Pferd **Hoppy** durch 1.500 Jahre Schachgeschichte. Konzept + Prototyp: Claude-Artifact „King of Chess“.
- **Stil B „gemalt“** (Johannas Wahl): Aquarell/Pergament, Schrift Cinzel für Überschriften. Alle Bilder in `public/king/` (KI-erzeugt mit Higgsfield/Nano Banana Pro). Neue Bilder im selben Stil erzeugen und vor dem Einbau ansehen (Orte auf der Karte prüfen!).
- Code: `src/lib/king.ts` (Stationen mit Kartenposition auf 1800×764, Meister-Gespräche, Rätsel, Lord-Fog-Runden, Fortschritt in localStorage `chess-trainer-king`), `src/screens/King.tsx` (Karte, Intro, Station, Gespräch, Minispiele, Bosse, Kriegszelt), `src/components/KingArt.tsx`, `src/king.css` (`.king-screen` = Pergament-Design).
- App hieß seit 07.11. **King of Chess**. Seit 09.11. (Prototyp in der Vorschau) heißt die App **Hoppy**: Kopfzeile „Hoppy“,
  Symbol auf dem Handy „Hoppy“, Titel/Manifest „Hoppy Chess“ (Store-Name). Die Geschichte (Liams Reise, Finale, Titel
  `titleOf`) heißt weiter „King of Chess“.
- **Explore-Modus (12.11. abends, Vorschau, Lu: „Explore = Karte + Geschichte, Training = Trainings-Modus“):** Startseite `#/` = `KingStamps` (`src/screens/KingStamps.tsx`): gemalte Karte mit Stadt-Kärtchen (`public/king/stamp-<id>.jpg`, Lage `AT` auseinandergezogen), Umschalter **Map | Regions** (Entwurf E und F, Lu testet beide), Straße gold + nur 3 Städte voraus, Hoppy erzählt oben im **Game-Boy-Kasten** (`src/components/StoryBox.tsx`, Text tippt sich, Antippen = weiter; auch Meister-Gespräch und Vorspann). Unten: START + Explore/Training(`#/tent`)/Daily/More. Karte merkt Scroll-Position (sessionStorage). **Nichts läuft automatisch weiter:** nach Schritt → zurück zur Stadt, nach Boss → zurück zur Karte, Überfall gewonnen → in die Zielstadt. Alte Karte unter `#/world`. Hoppy = gezeichnetes Maskottchen (`Mascot`/`MascotDrawing`), nicht mehr `hoppy.jpg`.
- **Barcelona (12.11., Vorschau):** eigene Station fürs Catalan (Lu: „Catalan und Ruy López trennen, mehr Catalan lernen“), nach Valencia; 7 neue Linien in `data/catalan.pgn` + 2 alte in `atlas2.pgn`; Meisterin Montse (gezeichnet, kein Foto), Boss „The Diagonal Bishop“ (`kind: 'lines'`). Bilder `barcelona.jpg`/`boss-diagonal.jpg` sind PIL-Platzhalter. Valencia hat nur noch Ruy López.
- **Brett (12.11.):** `dragActivationDistance: 10` in `Board.tsx` – vorher machte jedes leicht wackelnde Antippen am Handy einen Mini-Zug (Tippen ging verloren / Nachbarfeld). Nachgestellt mit Touch-Wackeln 3–8 px.
- **How do you react? (12.11.):** Zug auch auf dem Brett ziehen; oben steht der Name (`openingName()` in `king.ts`: eine Linie → ihr Titel, mehrere → gemeinsamer Name, sonst nichts).
- **Alle 17 Stationen gebaut** (07.11.): Kannauj, Persien, Samarkand, Bagdad, Der Norden, Valencia, Rom, Queen's Palace, Wien, Paris, London, Winterwald, Reykjavík, New York, Rio, Orbit, Chennai (Finale, öffnet erst wenn alle 16 anderen Bosse besiegt sind, `isOpen`). Jede Station: Bild, Meister mit Gespräch, Quests (`games`), eigene Linien (`lines` = Kapitel aus dem Repertoire) und ein Boss (`boss.kind`: army, riddle, board, lines, quiz, cross, krk, grand).
- Spiele (King.tsx): `BoardRounds` (Züge finden, 3 Herzen), `QuizRounds`, `KingSquares` (Blind-Felder), `KingQueen`, `CrossRounds` (welche Eröffnung wann), `KingRook` (Matt mit K+T gegen die „Maschine“), `Shuffle` (Chess960), `GrandTour`.
- Linien-Bosse (`lineRounds` in king.ts) fragen **nur Stellungen mit genau einer Antwort** im Buch der Station (z. B. Wiener: 3.f4 und 3.Bc4 beide richtig → wird nicht gefragt). Test sichert das ab.
- Bildnamen: Szene `<id>.jpg` (614×1100), Meister `<name>.jpg`, Boss `boss-<name>.jpg` (360×360). Klick-Test aller Städte: `scripts/e2e/king-all.mjs` (liest Antworten direkt aus `src/lib/king.ts` im Dev-Server).
- Die alte Übersicht ist `#/path` („All openings“), das Kriegszelt `#/tent` verlinkt alle alten Trainer.
- Zurück aus einer Linie landet man dort, wo sie geöffnet wurde (`src/lib/returnTo.ts`).
- Meister erzählen **nur belegte Fakten**. Lord-Fog-Runden kommen aus den echten London-Linien (Test in `src/lib/king.test.ts`).
- **Phase A (live seit 07.11. abends):** Schach-Check `#/check` (`src/lib/check.ts`, `src/screens/Check.tsx`, Startwert in `KingProgress.baseline`), Portal `#/portal` (`src/lib/portal.ts`, `src/screens/Portal.tsx`: Quests aus echten chess.com-Partien, Bericht je 20 Rapid-Partien, nur fertige Partien – Fair Play), Hauptweg `ROAD` Kannauj → Samarkand → Rom → Bagdad, Lichess-Puzzles CC0 in `src/data/lichess-puzzles.json`, Überfälle `#/encounter/<ziel>`, Kastanien 🌰 + Titel (`titleOf`), Knack (`fx.knack()` nur bei Wache/Drohung/Sicherheit). Lücken-Linien in `data/gaps_black.pgn`, `data/gaps_white.pgn`. `node scripts/check-lines.mjs 16 <dateiname>` (ohne `data/`).
- **Seit 12.11.2026 (Vorschau): kein Liam mehr (Lu: „nur noch Hoppy“).** Hoppy erzählt die Geschichte und reist mit dir; Meister begrüßen „Hoppy“ und „dich“, `who: 'liam'` gibt es nicht mehr (Test in `mirror.test.ts`). Vorspann = Hoppy, Weltkarte, Großmeister Lu. Karten-Figur = `hoppy.jpg`. `liamPortrait()` entfernt. **Offen:** Liam ist noch auf 23 von 27 Stadtbildern gemalt → neu malen nur über Higgsfield nach Lus OK (BAUPLAN 12).
- **Stand 08.11.2026 (damals live):** Liam ist ein Straßenkind, Großmeister **Lu** schickt ihn los (Intro `street-*.jpg`), Hoppy ist violett. Ansehen wächst mit den Bossen (`reputation()`), Porträt wächst mit dem Rang (`liamPortrait()`, `liam.jpg` … `liam-5.jpg`).
- **Geführte Reise:** `route()` in `king.ts` = `ROAD` (Kannauj → Samarkand → Rom → Bagdad), dann die übrigen Städte in `STATIONS`-Reihenfolge, Chennai zuletzt. `isOpen()` öffnet nur die nächste Stadt; geschaffte bleiben offen. Edinburgh (Schottisch) liegt vor London.
- **Spiegelwelt (Akt 2, Schwarz):** `MIRROR` in `king.ts` (nicht in `STATIONS`, zählt nicht für Chennai), öffnet nach Rom, geführt, eigene Karte `#/mirror` (`src/screens/Mirror.tsx`, `mirror-world.jpg`). Sieben Schatten, jede Eröffnung am Ort ihres Namens.
- **Kern-Training:** „How do you react?“ (`bookCrossroads()`, Schritt `choose` je Station), „Your habits“ (`#/habits`, `habitCrossroads()` in `check.ts` aus den letzten 100 Rapid-Partien), Eröffnungs-Atlas (`#/atlas`, `src/lib/atlas.ts`, 24 Familien, Linien in `data/atlas*.pgn`), Kreuzungen in Paris.
- **Echte Welt:** Schach-Check `#/check`, Portal `#/portal` (Quests aus echten Partien, Bericht je 20 Rapid-Partien). Training Camp `#/tent` (früher War Tent), Questbuch `#/quests`, Neustart in den Settings (`restartKing()`).
- **Kastanien-Knack (BAUPLAN 1):** `ChestnutReward` (golden bei vorsichtigem Spiel), Knack im Sparring (`defusedThreat`), sauberer Glanz + Schatten-Zahl auf der Karte (`src/lib/clean.ts`), nach dem Warm-up `#/afterwards`.
- **Armoury (BAUPLAN 2):** `#/armoury`, `src/lib/armoury.ts`, `src/screens/Armoury.tsx`; Fortschritt in localStorage `chess-trainer-armoury`. Lichess-Themen in `src/data/lichess-puzzles.json` nur ergänzen, die alten Listen nie neu würfeln (Stationen nutzen feste Positionen).
- **Drachenhöhle (BAUPLAN 3):** `mirror-dragon`, letzte Station der Spiegelwelt (Sizilien, x 812 / y 402 auf `mirror-world.jpg`). Bilder sind Platzhalter (PIL), siehe BAUPLAN 12.
- **Prüfwerkzeuge:** `scripts/check-lines.mjs`, `scripts/check-rounds.mjs` (alle Brett-Aufgaben mit Stockfish), `scripts/extend-line.mjs`, Klicktests in `scripts/e2e/` (Playwright, **nur auf Lus Laptop** – Lu 09.11.2026; Johanna will es auf ihrem Laptop nicht, dort prüft man mit `tsc`, Lint und Vitest und schaut in der Vorschau).
- **Was noch fehlt:** siehe `BAUPLAN.md`.

## Lernkonzept und Kennzahl (Lus Entscheidungen 08.11.2026)
- **Vor jedem Punkt `docs/LERNKONZEPT.md` lesen** (Recherche: wie man am besten lernt und beibringt). Alles danach bauen.
- **Hauptkennzahl „sichere Züge in %“** (`safePct` in `src/lib/accuracy.ts`): Anteil der Züge, die weniger als 2 Bauern
  verlieren. Lichess-Formel und chess.com nur zum Vergleich. Testseite `#/accuracy` (`src/screens/Accuracy.tsx`, `src/lib/scores.ts`).
- **Zwei Looks:** Settings → Look: Playful (Standard) / Calm for adults (`src/lib/look.ts`, `src/theme-calm.css`, Klasse `look-calm` auf `<html>`).
  Neue Seiten in beiden Looks ansehen.

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
