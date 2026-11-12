# Bauplan King of Chess – was noch gebaut wird

> **Für Claude Code:** Diese Datei ist die Arbeitsliste. Wenn eine Sitzung beginnt oder jemand
> `/weiterbauen`, „los“, „weiter“ oder „OK“ schreibt: nimm den **ersten Punkt mit `[ ]`**, sag in
> zwei Sätzen, was du baust, und bau ihn nach den Regeln unten – ohne weitere Rückfragen, außer du
> bist wirklich blockiert. Danach: Punkt auf `[x]` setzen, committen, Vorschau deployen, kurz melden.
> Schreibt jemand „alles“, arbeitest du die Punkte nacheinander ab, jeden einzeln in die Vorschau.
> Live (Branch `main`) geht etwas erst, wenn Lu oder Johanna „übernehmen“ sagt.

Stand: 12. November 2026. Live: https://l13959733-max.github.io/chess-trainer/ ·
Vorschau: https://l13959733-max.github.io/chess-trainer/preview/

## Für Johanna: so geht's

1. Die GitHub-Einladung annehmen: https://github.com/l13959733-max/chess-trainer/invitations
2. Einmalig: `git clone https://github.com/l13959733-max/chess-trainer.git && cd chess-trainer && npm ci`
   (Klicktests mit Playwright brauchst du nicht – die laufen nur auf Lus Laptop.)
3. Claude Code im Ordner starten (`claude`) und `/weiterbauen` tippen. Claude zeigt den nächsten
   Punkt und baut ihn. Erlaubnis-Fragen mit OK bestätigen (oder Shift+Tab für „auto-accept edits“).
4. Anschauen in der Vorschau-Adresse oben. Gefällt es: „übernehmen“ schreiben, dann geht es live.

## Regeln (bei jedem Punkt)

- **Arbeiten auf dem Branch `preview`.** Prüfen mit `git branch --show-current`. Live = `main`:
  „übernehmen“ heißt `git checkout main && git merge --ff-only preview && git push`, dann zurück auf `preview`.
- **Deploy:** Ein Push auf `main` deployt automatisch beides (Live und `/preview/`). Nach einem Push
  nur auf `preview`: `gh workflow run Deploy --ref main`.
- **Prüfen vor jedem Commit:** `npx tsc -b`, `npm run lint` (Stand: 12 Warnungen, nicht mehr werden),
  `npx vitest run` (alle grün). **Klicktests mit Playwright nur auf Lus Laptop** (Lu, 09.11.2026; Johanna will
  Playwright auf ihrem Laptop nicht – dort nicht installieren, dann reichen tsc, Lint, Vitest und Vitest-Tests für
  neue Logik). Ob Playwright da ist: `node -e "require('playwright')"`. Wenn ja, im Browser im Handy-Format:
  `npm run dev -- --port 5199`, dann `node scripts/e2e/king-all.mjs http://localhost:5199/ noshots` (ganzes Spiel
  bis zur Krone), `node scripts/e2e/regress.mjs http://localhost:5199/`, `node scripts/e2e/mirror.mjs`,
  `node scripts/e2e/continue.mjs http://localhost:5199/` (Continue nach einer Quest, Boss bei laufender Analyse;
  mit `webkit` als 2. Argument wie am iPhone). Einrichten: `npm i --no-save playwright && npx playwright install chromium`.
  Fehler, die Lu am Handy meldet: so nachspielen, nicht raten.
  Neue Eröffnungslinien: `node scripts/check-lines.mjs 16 <datei.pgn>` (nur Dateiname, ohne `data/`).
  Neue Brett-Aufgaben: `npx tsx scripts/check-rounds.mjs`. Linien aus Stockfish vorschlagen lassen:
  `node scripts/extend-line.mjs "1.e4 e5 2.f4" 8 18`.
- **Ansehen:** Lu oder Johanna schauen neue Seiten in der Vorschau am Handy an; in der Meldung sagen, was genau zu prüfen ist.
- **Das Repo ist öffentlich:** niemals Schlüssel, Tokens, Passwörter oder Einladungscodes committen.
- **Schach geht vor Geschichte.** Kern: welche Eröffnung wann, wie reagiere ich worauf, Drohung prüfen.
  Geschichte nur als kurzer Fakt, freiwillig.
- **Nur belegte Fakten** in Texten der Meister. Unsicheres weglassen. Keine Versprechen wie „+100 Elo“.
- **Fair Play:** Die App zeigt während einer laufenden chess.com-Partie nie Hilfe oder Engine-Werte.
  Sie liest nur fertige Partien.
- **Nichts Fremdes kopieren:** keine Figuren, Namen oder Bilder anderer Spiele, keine echten Personen nachmalen.
- **App-Texte auf Englisch** (UI, Linien, Gespräche). Design: Pergament-Stil (`src/king.css`, Schrift Cinzel).
- **Bilder:** Higgsfield ist Lus Konto (kostet Geld, nur nach Absprache). Kostenlos geht: vorhandene
  Bilder per Python/PIL spiegeln und einfärben (so ist die Spiegelwelt gemacht). Neue Stadtbilder ohne Liam malen.
- **Nach jedem Schritt muss die App laufen.** Bestehendes verbessern, nicht verschlechtern; nichts löschen, was Lu mag.
- **Lernprinzipien beachten** (Recherche vom 08.11., Kurzfassung in `docs/LERNKONZEPT.md`, vor jedem Punkt lesen):
  selbst abrufen statt anschauen, kurz und verteilt wiederholen, Aufgaben mischen, erst raten lassen, dann
  erklären, Hilfe nach und nach weglassen, Lob nur mit Information („gut, weil …“) und nur für das richtige
  Verhalten (Drohung geprüft, sicherer Zug), Belohnungen eher überraschend als angekündigt.

## Die Punkte

### [x] 0. FEHLER ZUERST: Nach einem Spiel reagiert die App nicht mehr (Lu, 09.11.2026) – behoben 09.11.
Lu: „Ich spiele ein Spiel und danach reagiert das nicht mehr, lädt nicht mehr, ich kann nicht weiterspielen“
(z. B. Gabel-Training in Samarkand, am Handy, live).
**Ursache (im Handy-Format nachgespielt):** Die Rätsel-Bosse (Samarkand: Caravan Thief, Bagdad: Grandee) und der
Armee-Boss mischten ihre Aufgaben bei *jedem Neuzeichnen* der App neu (`shuffle(...)` direkt in `BossFight`).
Läuft im Hintergrund die Analyse der chess.com-Partien (Portal, Schach-Check, Your habits – sie läuft weiter,
auch wenn man die Seite verlässt), zeichnet die App nach jedem analysierten Halbzug neu → das Brett sprang auf
eine andere Aufgabe, der Zug kam nie an. Gemessen: alter Code 9 verschiedene Bretter in 7,5 s, neuer Code 2
(Startstellung + Gegnerzug). Fix: Aufgaben einmal pro Kampf ziehen (`useState` in `BossFight`).
„Continue“/`NextStep`/`isOpen`/`route()` geprüft: keine Weiterleitungs-Schleife gefunden.
**Nicht geprüft (kann ich nicht sehen):** ob auf Lus Handy gerade eine Analyse lief. Tritt es nach dem Update
noch auf: Lu fragen, welches Spiel genau, und ob vorher Portal/Schach-Check/Your habits offen war.

### [x] 1. Kastanien-Knacken: das Gefühl für den sicheren Zug (Lus wichtigster Wunsch)
Idee aus „Die Macht der Gewohnheit“ (Pepsodent-Zahnpasta prickelt, das Prickeln wird mit „sauber“
verbunden). Bei uns: Das „Knack“ gehört an das **richtige Verhalten** – vor dem Zug die Drohung prüfen und
sicher spielen. Nur dafür, nicht für alles. Schon gebaut: `fx.knack()` in `src/lib/feedback.ts`
(Geräusch, Vibration) und die Klasse `.knack` (Goldschimmer) bei Wache, „Is it safe?“ und Drohungs-Aufgaben.
Noch bauen:
- **Sichtbare Kastanie:** Bei jeder Belohnung (`QuestDone`, `Victory`, Portal-Quests, Überfall) fliegt
  eine gemalte Kastanie ins Bild, knackt hörbar auf, und die verdienten Kastanien purzeln heraus und
  zählen hoch. Bei vorsichtigem Spiel eine **goldene** Kastanie. `prefers-reduced-motion` beachten.
- **Knack auch im Sparring** (`src/screens/Play.tsx`, Partie gegen Hoppy-Bot): Wenn der Gegner etwas
  bedroht hat und dein Zug es löst, ohne etwas einzustellen → Knack.
- **„Sauberer Glanz“:** Eine echte chess.com-Partie ohne groben Fehler (Auswertung wie im Portal)
  bekommt ein Zeichen, und die Weltkarte wird mit jeder sauberen Partie ein Stück heller.
- **Schleife schließen:** Nach „Warm-up“ → „Play on chess.com“: Kommt man zurück, bietet die App
  „Wie lief's? Partie auswerten“ an (nur fertige Partien) und zeigt „Wo hätte die Wache geholfen?“ als Aufgabe.
- **Das Problem spürbar machen:** Auf der Karte ehrlich aus echten Partien, z. B. „Der Schatten hat in
  deinen letzten 10 Partien 7-mal zugeschlagen“ (Zahlen aus dem Schach-Check, nie erfunden).
- **Grenze:** keine Schuldgefühle, keine Dauer-Pushs. Serien sind erlaubt (Lu, 09.11.2026), aber mit Schutztagen
  und bleibendem Rekord, siehe Punkt 21.

**Gebaut 08.11.:** `src/components/Chestnut.tsx` (`ChestnutReward`: Igel-Schale fliegt ein, knackt, Kastanien
purzeln, Zahl zählt hoch; golden = `takeCareful()` in `feedback.ts`: mindestens ein Knack und kein Fehler seit
Beginn der Aufgabe). Sparring-Knack: `defusedThreat()` in `src/lib/safety.ts`, Hinweis in `Play.tsx`.
Sauberer Glanz + Schatten-Zahl: `src/lib/clean.ts` (nur analysierte Partien, Glanz ab dem Schach-Check),
Karte unten. Schleife: Warm-up merkt `warmupAt`, Karte zeigt „Back from chess.com?“ → `#/afterwards`
(`src/screens/Afterwards.tsx`) → `#/threats/games/<uuids>`.

### [x] 2. Waffenkammer und Schilde (Taktik, Verteidigung, Mittelspiel, Endspiel)
Im Training Camp: jede Technik ist eine Waffe (Angriff) oder ein Schild (Verteidigung) mit Bronze,
Silber, Gold. Gold nur ohne Hilfe und erst, wenn es in echten Partien klappt. Ablauf je Technik:
zeigen → mit Hilfe → frei → verteidigen → gemischt → echte Welt. Reihenfolge Taktik: Wache → Gabel →
Fesselung → Spieß → Abzug → Beseitigung des Verteidigers → Ablenkung/Hinlenkung/Überlastung → Zwischenzug
→ Kombinationen. Dazu Mattbilder, Mittelspiel (Pläne aus typischen Bauernstrukturen, Vorteil verwerten),
Endspiel (einfach → schwer, gegen Stockfish ausspielen). Aufgaben aus der Lichess-Datenbank (CC0):
`scripts/pick-lichess-puzzles.py` erzeugt `src/data/lichess-puzzles.json`; Themen dort erweitern.

**Gebaut 08.11.:** `#/armoury` (Training Camp → „Armoury & Shields“), `src/lib/armoury.ts` (+ Tests),
`src/screens/Armoury.tsx`. 23 Techniken: 10 Taktiken, 7 Mattbilder, 2 Mittelspiel (Vorteil verwerten,
Verteidigen), 4 Endspiele. Stufen: See it → With help (Hinweis-Knopf) → Alone → Shield → Mixed → Real world.
Bronze/Silber/Gold, Gold nur ohne Hilfe und nach 5 echten analysierten Partien in Folge ohne diesen Fehler.
15 neue Lichess-Themen (die 8 alten Listen sind unverändert, damit die Stationen gleich bleiben).
**Noch offen:** Überlastung (kein eigenes Lichess-Thema), Pläne aus Bauernstrukturen, Endspiele gegen
Stockfish ausspielen (braucht geprüfte Texte bzw. Stellungen).

### [x] 3. Drachenhöhle (Sizilianisch Drache)
Station in der Spiegelwelt (Höhle unter dem Ätna). Der Drache ist ein Verbündeter = Läufer auf g7
(Feueratem = lange Diagonale). Quests: Feueratem, den Drachen am Leben halten (Lg7 nicht tauschen),
c-Linie und Qualitätsopfer auf c3. Boss: Drachenjäger (Jugoslawischer Angriff). Linien gibt es schon
(Kapitel „Sicilian Dragon“). Fakt nur so: Den Namen gab laut eigener Aussage Fjodor Dus-Chotimirsky
(Sternbild Drache).

**Gebaut 08.11.:** Station `mirror-dragon` („The Dragon Cave“, letzte der Spiegelwelt, auf Sizilien) in `MIRROR`
(`src/lib/king.ts`): Gespräch mit Lu, Quests `firebreath`, `keepdragon`, `cfile` (`DRAGON_FIRE/ALIVE/CFILE`,
Stellungen aus den geprüften Linien in `data/sicilian.pgn`, Test prüft Legalität), Boss „The Shadow Dragon Hunter“
(Linien-Boss). **Bilder sind Platzhalter** (kostenlos per PIL): `mirror-dragon.jpg` = eingefärbter Ausschnitt der
Spiegelkarte um Sizilien, `boss-shadow-dragonhunter.jpg` = gespiegelte, glutrot eingefärbte `boss-guard.jpg`.
Ein gemaltes Höhlenbild gehört zu Punkt 12.

### [ ] 4. Kastanien-Laden
Kastanien kaufen nur Aussehen, nie Vorteile: Umhang, Stiefel, Sattel für Hoppy, Brettfarben.

### [ ] 5. Charakter und eigener Name
Am Start: Name wählen (Standard „Liam“), der Name erscheint in allen Texten. Später mehrere Helden
(Jungen und Mädchen, braucht Bilder).

### [ ] 6. Coach = Geist von Großmeister Lu
Ein Hilfe-Knopf „Call Lu's spirit“ in Quests und Linien zeigt einen Hinweis. In den Settings abschaltbar.
Wer Hilfe nutzt, bekommt kein Gold.

### [ ] 7. Gefährten
Zusammen spielen gibt es schon (`src/lib/live.ts`, `src/screens/Watch.tsx`, ein Raum pro Gerät). Neu: eine
Gefährten-Liste mit einem eigenen privaten Raum je Freund, Online-Anzeige. Je Gefährte der chess.com-Name:
Knopf zum Profil (dort live zuschauen), Herausfordern-Link (Adresse vorher prüfen), seine fertigen Partien.
Nie Hilfe während einer laufenden Partie, auch nicht für Zuschauer.

### [x] 8. Schnellreise aus dem Training Camp – gebaut 09.11. (Vorschau): `#/road`, Knopf „Fast travel“ auf der Karte und im Training Camp
Liste der freien Orte mit „fällig“-Zahl (Linien zum Wiederholen), Antippen = direkt dorthin.

### [ ] 9. Chronik
Freiwillig lesbare Geschichte der Meister und Eröffnungen. Nur belegte Fakten.

### [ ] 10. Atlas: „gesehen in deinen Partien“ und Wochen-Vorschlag
Je Eröffnungsfamilie der Stand gesehen / gelernt / gemeistert aus den echten Partien
(`bookReport` in `src/lib/check.ts`). Dazu „Probier diese Woche …“ mit kurzer Begründung.

### [ ] 11. Offene Welt nach der Route
Neue Regionen öffnen mit echter chess.com-Wertung (1500 / 1800 / 2000+): Rechnen, Pläne, Verwerten,
Zeit, schwere Endspiele, Meisterprüfungen. Endlose Lichess-Aufgaben in eigener Stärke, ein Rivale, der
mitwächst, Saisons. Ranglisten: erst eine Freundes-Liga, später kleine Ligen nach Niveau (Lu, 09.11.2026, Punkt 22).

### [ ] 12. Bilder aufräumen (braucht Higgsfield-Credits, nur nach Absprache mit Lu)
Die Stadtbilder zeigen noch Liam als Prinzen (violettes Gewand, Goldreif). Lu: Straßenkind in Lumpen
„sieht zu arm aus“ → Liam in den Städten in der Kleidung seines Rangs (wie `liam-2.jpg` bis `liam-5.jpg`).
Edinburgh-Bild: Melone ist ein Zeitfehler (gab es erst ab etwa 1850).
Drachenhöhle: echtes gemaltes Bild „Höhle unter dem Ätna“ (ohne Liam) und eigener Drachenjäger statt der Platzhalter.

### [ ] 13. Persönliche Linien für andere Spieler
Die App kennt nur das eingebaute Buch. Für fremde Eröffnungen aus den Partien eines Spielers mit
Stockfish im Browser eine geprüfte Linie erzeugen und als eigene Linie speichern.

### [ ] 14. Kleinigkeiten
React-Warnung im Brett (`background` und `backgroundColor` gemischt bei Letzter-Zug + Schach),
Teilen-Karte für den Bericht, `CLAUDE.md` aktuell halten.

### [ ] 15. Vor dem Play Store (Entscheidungen von Lu nötig)
Name: **Hoppy** (Lu, 09.11.2026; Prototyp in der Vorschau). Auf dem Handy „Hoppy“, im Store „Hoppy Chess“, weil es
im App Store schon Bier-, Happy-Hour- und Dating-Apps „Hoppy“ gibt und „Hoppy“ eine japanische Getränkemarke ist
(Hoppy Beverage Co.). Vor dem Store: Markenprüfung „Hoppy Chess“ in TMview/EUIPO, Klassen 9 und 41 (nicht geprüft).
hoppychess.com war am 09.11. laut Whois frei (nicht gekauft). Die Geschichte heißt weiter „King of Chess“. Android über
Bubblewrap, **Stockfish ist GPL-3.0** (vor dem Store-Start klären), erwachsener Standard-Look.

### [ ] 16. Zugbewertung und „sichere Züge in %“ als Hauptkennzahl (Lus Wunsch 08.11.)
Vorbild chess.com: Anerkennung für gute Züge motiviert (Brilliant, Great, Good, Genauigkeit in %).
Lu vertraut fremden Formeln nicht blind. **Lus Entscheidung 08.11.: „sichere Züge in %“ wird die
Hauptkennzahl der App** (misst genau seine wichtigste Gewohnheit: Drohung prüfen, nichts einstellen).
Lichess-Formel und chess.com bleiben nur zum Vergleich.

**Schon gebaut (Prototyp, Branch `preview`):**
- `src/lib/accuracy.ts` (+ Tests): `scoreGame()` liefert pro Zug alle Zwischenwerte (Bewertung vorher/nachher,
  Gewinnchance, Lichess-Zug-Genauigkeit, sicher ja/nein) und pro Partie `safePct`, `lichess`, `meanAccuracy`.
  „Sicher“ = weniger als `SAFE_CP` (= `BLUNDER_CP`, 2 Bauern) verloren, dieselbe Grenze wie der Blunder-Trainer.
- `src/lib/scores.ts`: bewertet die neuesten fertigen Rapid-Partien mit unserem Stockfish (Tiefe 12/14/18),
  speichert getrennt in localStorage `chess-trainer-scores` (fasst die Puzzle-Daten nicht an).
  chess.com-Zahl aus dem Feld `accuracies`, nur wenn die Partie dort ausgewertet wurde.
- Testseite `#/accuracy` (`src/screens/Accuracy.tsx`), Link im Training Camp „How well did I play? (test)“:
  drei Zahlen nebeneinander, Antippen zeigt jeden Zug mit allen Werten.
- Erkenntnis aus dem Test: Nach der Lichess-Formel bekommt ein Zug, der Matt in 1 zulässt, noch etwa 13 %
  (weil die Gewinnchance vorher nur ~45 % war). Ein Grund mehr für „sicher ja/nein“.

**Noch bauen (in dieser Reihenfolge, jeden Schritt einzeln in die Vorschau):**
1. **Kennzahl überall gleich:** `safePct` auch für Partien gegen Hoppy-Bot berechnen (`analyzeBotGame` in
   `src/lib/analyzer.ts` hat die Bewertungen schon) und für chess.com-Partien im Portal-Bericht (je 20 Partien).
2. **Sichtbar machen:** Auf der Startkarte bzw. im Portal „Safe moves: 72 % (last 20 games, was 61 %)“ mit
   kleinem Verlauf. Nur echte Zahlen; ohne Daten nichts anzeigen.
3. **Nach jeder Partie:** kurze Zusammenfassung: sichere Züge in %, der unsicherste Zug zum Nachspielen
   („Where would the watch have helped?“), der beste Zug der Partie mit Begründung.
4. **Zeichen pro Zug** (nach 1–3): Brilliant (!!) = (fast) bester Zug mit Materialopfer, der gut steht – selten,
   goldene Kastanie + Knack; dazu Best / Great / Good. Lob immer mit Grund (`reason()` in `coach.ts`).
   Eigene Zeichen im Pergament-Stil, keine chess.com-Symbole oder -Farben.
5. Testseite `#/accuracy` danach behalten, aber aus dem Training Camp in die Settings verschieben.
- Grenzen: Fair Play (nur fertige Partien), keine erfundenen Zahlen, keine Versprechen wie „+100 Elo“.

### [ ] 17. Ruhiger Look für Erwachsene (Lus Wunsch 08.11.)
Die App soll auch für andere sein; der bunte Kinder-Look kann Erwachsene abschrecken.

**Schon gebaut (Prototyp, Branch `preview`):** Settings → „Look“: *Playful* (Standard) oder *Calm (for adults)*.
`src/lib/look.ts` (localStorage `chess-trainer-look`, setzt `<html class="look-calm">`), Styles in
`src/theme-calm.css`: ruhige Farben, Systemschrift, flache Knöpfe, kein Maskottchen auf den einfachen
Trainings-Seiten (in der Geschichte bleibt Hoppy). Die gemalte Welt (`.king-screen`) bleibt in beiden Looks gleich.

**Noch bauen:**
1. Die bunten Kacheln auf `#/path` (Orange „My weaknesses“, Lila „Win it“) und die Farben in Drill, Puzzles,
   Play im ruhigen Look angleichen; jede Seite einmal am Handy in beiden Looks ansehen (in der Vorschau).
2. Beim ersten Start (`Welcome.tsx`) fragen: „Who is playing? A child / An adult“ → setzt den Look; jederzeit
   in den Settings änderbar.
3. Texte im ruhigen Look sachlicher (z. B. weniger Ausrufezeichen); Inhalt bleibt gleich.
4. Prüfen, ob die Weltkarte im ruhigen Look so bleiben soll (Lu fragen, Bild zeigen).
Hängt mit Punkt 15 (Play Store, „erwachsener Standard-Look“) zusammen.

## Viral (Lus Auftrag 09.11.2026)

Ziel: eine App, mit der man wirklich gut Schach lernt, die man verkaufen kann und die sich über TikTok,
YouTube Shorts und Instagram Reels verbreitet. Kern in einem Satz: **„Look before you move – or the Shadow takes it.“**
(Hope Chess = Figuren einstellen, der häufigste Fehler unter 1200 und Lus Hauptfehler.)
Entwürfe zum Anschauen (nur für Lu sichtbar, bis er sie teilt): https://claude.ai/artifact/76Q5Mpf49WYrrskYKfaX9G
– obere Reihe = erste Variante im Duolingo-Stil (Lu: zu weit weg vom alten Design), untere Reihe = Zwischending A und B.
Die Geschichte bleibt Zusatz: Chronik-Karten zum Lesen, nie abgefragt wie Vokabeln.

### [x] 18. Daily Threat Check + Teilen-Raster + Herausforderungs-Link – Tagesrätsel + Teilen gebaut 09.11. (Vorschau)
Ein Tagesrätsel, für alle gleich (aus `src/data/lichess-puzzles.json`, Auswahl über das Datum, ohne Server), Thema
„Is it safe?“ / Drohung erkennen, ein Versuch. Danach Teilen-Text ohne Spoiler (Nummer, Zeit, Raster aus Quadraten,
Link). Herausforderungs-Link: Stellung steckt in der Adresse („Spot it before I did“). Hängt mit Punkt 14 (Teilen-Karte) zusammen.

**Gebaut 09.11.:** `src/lib/threatcheck.ts` (+ Test): Tag 1 = 09.11.2026 (lokale Tage), Pool aus 7 Themen (hanging, fork,
mate1, pin, backrank, skewer, discovered), Positionen 18–33 jeder Liste, Doppelte raus (109 Tage, dann von vorn).
Seite `#/threat-check` (`src/screens/ThreatCheck.tsx`, nutzt `OnePuzzle` im Drohungs-Modus): ein Versuch, Zeit läuft ab
dem eigenen Zug, Ergebnis in localStorage `chess-trainer-threatcheck`, am selben Tag kein zweiter Versuch. Teilen über
das Teilen-Menü des Handys, sonst Zwischenablage; Text ohne Zug und ohne Thema („🟩🟩🟩 spotted in 9 s“ / „🟥 the Shadow
got me“). Karte auf der Weltkarte unter Hoppys Sprechblase (`DailyCard` in `King.tsx`).
**Noch offen:** Herausforderungs-Link mit eigener Stellung in der Adresse.

### [x] 19. Leuchten beim richtigen Zug (Entwurf B) – gebaut 09.11. (Vorschau)
In Drill, Puzzles, Quests: richtiger Zug → Zielfeld und Figur leuchten grün und pulsieren. Vorsichtig und richtig
(`takeCareful()`, ohne Hilfe) → gold, stärker, mit Knack und goldener Kastanie. Mit Hinweis/Hilfe: Zug zählt, aber kein
Leuchten, kein Gold. So stark, dass es auf einer Bildschirmaufnahme gut zu sehen ist. `prefers-reduced-motion` beachten.
„Brilliant !!“ erst mit Punkt 16.4 (Stockfish-Prüfung).

**Gebaut 09.11.:** `fx.glow(feld, 'good' | 'gold', geholfen)` in `src/lib/feedback.ts` (+ Test), das Brett hört über
`onGlow` zu (`src/components/Board.tsx`, nur `box-shadow`, Keyframes `glow-good`/`glow-gold` in `src/theme-kids.css`;
ohne Bewegung bleibt die Farbe kurz stehen). Angeschlossen: Drill (kein Leuchten, wenn nach einem Fehler der Zug gezeigt
wurde), Puzzles und „Punish it“ (kein Leuchten nach der Auflösung), Stadt-Aufgaben `BoardRounds` (gold bei Wache/Drohung,
kein Leuchten nach dem grünen Pfeil), `OnePuzzle` auch in der Armoury (gold bei Drohungs-Aufgaben, kein Leuchten nach
Hinweis), Sparring (gold bei abgewehrter Drohung, nur ohne Safety Check). Lernen-Modus leuchtet nicht (dort wird gezeigt).

### [ ] 20. Schatten-Geschichte
Ein Gegenspieler für alles: der Schatten = das Einstellen von Figuren. Er wächst aus den echten Partien (Zahlen nur
aus dem Schach-Check, `src/lib/clean.ts`), jede saubere Partie schwächt ihn. Jeder Meister hat ihn einmal besiegt und
gibt Liam eine Waffe. Finale Chennai: der eigene Schatten aus eigenen Fehlerstellungen. Vor allem Texte; bestehende
Schatten (Spiegelwelt, Lord Fog) einordnen, nichts löschen. Hoppy reagiert (Augen zu bei eingestellter Figur, stolz bei
erkannter Drohung) – Humor über den Zug, nie über die Person.

### [ ] 21. Serie mit Schutztagen
Tagesserie behalten (Lu: „Serien sind geil, wenn man sie behalten will“). Zählt nur mit echtem Mindestinhalt
(z. B. Daily Threat Check + eine fällige Linie). Schutztage mit Kastanien verdienen. Rekord („Best: 52 days“) bleibt
immer stehen. `streak` in `src/lib/progress.ts`.

### [ ] 22. Ligen (braucht Lus Entscheidung: Server)
Erst Freundes-Liga, später kleine Ligen (20–30 Leute, ähnliches Niveau, wöchentlich, Auf-/Abstieg). Gezählt werden
sichere Züge bzw. gelöste Aufgaben, nicht Spielzeit. Braucht einen Server mit Datenbank (Kosten, Pflege) – heute hat
die App keinen. Spitznamen statt echter Namen (Kinder, DSGVO). Gegen Schummeln: ein Versuch, auf Zeit.

### [ ] 23. Clips im Format 9:16 aus der App
„Can you spot the threat in 5 seconds?“ mit Countdown, aus dem Tagesrätsel; ein Clip für TikTok, Shorts und Reels.
Englisch. Bilder über Higgsfield nur nach Absprache (kostet Geld).

### [ ] 29. Startseite als Übersicht (Entwurf 12.11. abends, Lu prüft – soll mit dem nächsten Live-Gang rein)
Vorbild: Lus Pinterest-Bild (dunkle Schach-Startseite mit Kacheln). In unserem Buch-Stil umgesetzt:
https://claude.ai/artifact/4xnj2VNHiBgM7NritfVw2n – oben Gruß + Serie + Kastanien; große Reise-Kachel (gemalte Karte,
„Chapter 8 · Barcelona“, „Continue journey“); Kacheln: Zitat (Grandmaster Lu aus der App), Reise-Fortschritt, Daily Threat
Check mit echtem Brett, Square Rush, Training (fällige Linien, verlorene Partien, Hoppy-Bot), „New in your book“; unten
Leiste Home · Map · Hoppy (weiter spielen) · Training · More. Seitenleiste des Vorbilds weggelassen (zu eng am Handy).
Fremde Zitate des Vorbilds bewusst NICHT übernommen (Herkunft oft falsch) – nur eigene Sätze aus der App.

### [x] 28. Square Rush – Felder lernen mit Candy-Crush-Gefühl – gebaut 12.11. abends (Vorschau `#/rush`, Training + More; Lu: „richtig geil“, Knöpfe später anpassen)
Lu: „Bischof g2 – dann muss ich ewig suchen … ein Spiel mit leerem Brett, wechselnde Figuren, aufs Feld ziehen, Bumm …
Belohnung wie Candy Crush: dreimal, dann explodiert es, mit Geräuschen, Vibration, Feeling.“
Entwurf (nicht in der App): https://claude.ai/artifact/KfcDN3316iuxHj9GRf3Mgq – Hoppy nennt „Knight to f3“, mögliche Züge
als Punkte, Tipp aufs Feld → Figur springt, Funken, Ton steigt mit jeder Serie; 3 richtige = Explosion, Wackeln, Akkord,
Vibration, +50, +2 s; falsch = Feld rot, richtiges grün, Name des getippten Felds. 60 s, Sterne, Bestwert. Figur wechselt
alle 5 Züge (Springer, Läufer, Turm, Dame, König, Bauer). Schalter: Buchstaben am Rand, Züge zeigen, als Schwarz.
Töne im Browser erzeugt (keine Dateien). Vibration nur Android (iPhone-Safari kann es nicht). Gibt es schon klein in
Bagdad („Blindfold: find the square“) – das hier wäre ein eigenes Spiel, z. B. im Training oder als Tagesspiel.

### [ ] 27. Echte Karte statt gemalter (Entwurf 12.11. abends in der Vorschau, Lu prüft)
Lu: „Map so wie in meiner Neuhaus-Software, quasi Google Maps … darauf spielen und reisen“. Gebaut: `src/screens/RealMap.tsx`,
Seite `#/realmap`, Knopf unter More → „Real map (draft)“. MapLibre GL **5.6.0** (wie Neuhaus; 6.x startet seinen Worker
unter Vite nicht) + OpenFreeMap „positron“ (OSM, gratis, kein Schlüssel), umgefärbt in Buchfarben (`bookStyle`). Nur bei
Bedarf geladen (eigenes Paket ~1 MB). Städte = Münzen an echten Koordinaten (`LNGLAT`), Straße terrakotta (gespielt fest,
3 voraus gestrichelt), Hoppy an der nächsten Stadt, Antippen = hinfliegen + Karte unten „Open …“. Ansicht wird gemerkt.
**Offen (Lu):** Orte für erfundene Stationen (jetzt: Persia = Isfahan, North = Trondheim, Queen's Palace = Göttingen,
Winter Forest = russischer Wald, Orbit = Baikonur); Spiegelwelt fehlt; Route springt quer (geografische Reihenfolge?);
braucht Internet. Farben je Region: Entwurf https://claude.ai/artifact/5SycDXEQ3FUC1worZopP9x (Terrakotta für Indien,
Orient, Spanien/Italien = Lus Wahl; Rest Vorschlag: Bordeaux Paris/Wien, Grün Britannien, Fjordblau Norden,
Art-déco-Blau New York, Grün-Gelb Rio, Indigo Orbit).

### [ ] 26. Jede Stadt als Buchkapitel (Prototyp Barcelona 12.11. abends, Lu: „ziemlich cool … später für alle Städte“)
Vorbild: Lus Pinterest-Entwurf einer Geschichts-Lese-App. Prototyp (nicht in der App): https://claude.ai/artifact/9xBztKQ3qBXHuELJ7L88LV
– **Ablauf:** Stadt auf der Karte antippen → **Titelblatt** (Stadt, Jahr, Untertitel, großes Bild im Bogen) → nach unten
  scrollen → **Kapitel** (Kapitel-Nr. = Platz in `route()`, Überschrift = die Technik, 2 kurze Absätze, Skill-Pillen,
  „Table of content“ = die Schritte der Stadt bis zum Boss) → erster Eintrag öffnet die **dunkle Leseseite** mit der
  Geschichte, unten Leiste „Contents“ + „Play the first line ▶“. Ersetzt auf der Stadt-Seite den Game-Boy-Kasten.
– **Hausfarbe = Terrakotta `#7a3420`** (Lu 12.11. abends, statt Schwarz; Erdton passend zu den Holzbrettern; soll später durch die ganze App gehen).
– **Schema für alle Städte gleich:** Papier creme, Terrakotta, Rot; Garamond-Überschriften, Inter-Text; Bogen-/U-Rahmen der Bilder.
– **Drei Bilder je Stadt:** (1) zur Geschichte (was wo passiert ist), (2) zur Technik (Brett mit der Idee), (3) zum Namen
  des Bosses. **Bildsprache aus der Stadt selbst**, nicht überall dieselbe (Lu: Streifen + rote Sonne „sieht japanisch
  aus, passt nicht zu Barcelona“). Barcelona = Gaudí-Mosaik (Trencadís), Blumen-Gehwegplatte (Panot), Zementfliesen,
  Sagrada-Família-Türme. Für jede Stadt vorher ihre typische Ornamentik festlegen. Prototyp-Bilder sind von Claude in SVG
  gezeichnet; schönere mit Higgsfield nur nach Lus OK (kostet).
– **Erzählton:** keine Kinder-Dialoge („¡Hola Hoppy!“), sondern spannend erzählte Geschichte für Erwachsene, Jugendliche
  und Kinder – wie ein gutes Geschichtsbuch. Danach 1–2 Kästen „On the board“ mit der Schachidee. **Nur belegte Fakten**,
  jede Stadt vorher recherchieren, Quellen notieren.
– **Barcelona belegt:** Turnier 24.9.–11.10.1929 parallel zur Weltausstellung; Capablanca +13 =1 −0; Feld überwiegend
  lokal, Tartakower zweiter großer Name; Veranstalter baten ihn um eine Eröffnung zu Ehren Kataloniens → „Catalan“
  (Zug an sich schon bekannt). Quellen: en.wikipedia Catalan Opening, enciclopedia.cat, chess.com „A Century of Chess:
  Capablanca Tournaments 1929“, belgianchesshistory.be.
– **Fehler in der App (offen):** Montse sagt „strong players from many countries came“ – laut Quelle Feld überwiegend lokal.
– **Varianten getrennt (Lu 12.11. abends: „super“):** In jeder Stadt das Inhaltsverzeichnis nach Eröffnung gruppiert, jede
  Variante ein eigener Eintrag, den man einzeln öffnet. Übersicht aller Städte aus den echten Linien:
  https://claude.ai/artifact/AA8nnb58jzbvuWmp5BNM8P (Kannauj, Samarkand, Bagdad, Persien, Norden, Orbit, Chennai haben keine
  Eröffnungen, nur Grundlagen/Taktik).
– **Keine Spiegelwelt mehr (Lu 12.11. abends, „realistischer, sortierter“):** jede Stadt hat beide Seiten, „As White – you
  attack“ und „As Black – you defend“ (Schwarz-Eröffnungen heißen Verteidigungen). Schwarz-Teil kommt in die Stadt, auf
  die der alte Spiegel-Name zeigte: Mirror Kannauj (Königsindisch) → Kannauj, Mirror North (Skandinavisch, Nimzo-Indisch)
  → The North, Mirror Vienna (Caro-Kann, Grünfeld) → Vienna, Mirror Paris (Französisch) → Paris, Mirror Forest (Slawisch,
  Pirc) → Winter Forest, Mirror Rio (Najdorf) → Rio, Shadow Fortress (Damengambit abgelehnt, gegen London, Holländisch)
  → London. **Drachenhöhle bleibt eigener Ort** (Sizilien/Ätna, nur Schwarz; Lu: „ziemlich geil“). Entwurf: gleicher Link.
– **Moskau = Petrov-Verteidigung als Schwarz richtig lernen** (Lu 12.11.: „in Russland die Petrov ordentlich lernen“;
  Rom behält seine 2 Weiß-Linien gegen Petrov). `data/petrov_black.pgn`: 7 Linien (Hauptlinie 5.d4, 5.Nc3, 5.Qe2,
  3.d4, 3.Nc3, Cochrane-Gambit, Falle 3…Nxe4?), alle mit check-lines Tiefe 18 ohne Fehler. Station selbst (Text,
  Bilder, Boss) noch nicht gebaut; Geschichte vorher recherchieren.
– **Neue Station Moskau (Lu: „finde ich gut“):** „Die Sowjet-Schule – von Botvinnik bis Kasparov“. Offen: A) Petrov
  („Russische Partie“) zieht von Rom nach Moskau, oder B) etwas Neues (z. B. gegen die Königsindische). Fakten vorher prüfen.
– **Offen (Lu):** Montse (erfundene Figur) fällt auf der Leseseite weg – ganz weg oder woanders (z. B. beim Üben)?

### [ ] 25. Stadt von innen + Trainings-Modus (Entwurf 12.11. abends, Lu prüft)

Lu: „Map = Karte + Geschichte, daneben ein Trainings-Modus“; die Schritte in der Stadt „wie Duolingo, nice – noch ausarbeiten?“.
Entwurf (nicht in der App): https://claude.ai/artifact/NvJQKAiRbVmwDJJDyNYoaJ – **Stadt Rom** als Duolingo-Weg in Abschnitten
(Meister → je Eröffnung ein Abschnitt mit „Guide“ → Prüfung + Boss), Hoppys Game-Boy-Kasten oben, Weiter-Knopf darunter;
**Training A** („Today’s training“ + 3 aufklappbare Bereiche statt 17 Knöpfen) und **Training B** (täglicher 5-Schritte-Pfad + Regal
„More to practise“). **Lu wählt.**

### [ ] 24. Weltkarte mit klarem Weg (Entwurf A)

**12.11. (Lu: „Drumherum weg, Städte sauber verbunden, Zwischending mit Duolingo“):** Drei Entwürfe als Link (nur Entwurf,
nicht in der App): https://claude.ai/artifact/FEGPu2fDYBwNY1xQjm3BPB – A Goldene Straße, B Städte-Münzen, C Karte oben + Pfad
unten; Schalter „Reihenfolge jetzt / nach Geografie“. **Lu wählt** eine Variante und ob die Reihenfolge geografisch wird.
**Runde 2 (12.11. abends, Lu: „Hintergrund schlichter, ruhiger, klarer; Duolingo, aber Städte detaillierter“):** gleicher Link,
Version 3: ruhige Karte (`map-calm.jpg`, aus worldmap.jpg gerechnet: Land/Meer-Flächen + Hauch Malerei), Städte groß und in Europa
auseinandergezogen, Straße nur bis 3 Städte voraus, Duolingo-Hoppy. D Münzen, E Kärtchen, F Regionen (ein Erdteil, seitlich scrollen).
 – aufgeräumte Karte 09.11. in der Vorschau, Lu prüft

**Stand 09.11. abends (Lu: „die geile Illustration nehmen, Hintergrund-Klatter aussäubern, besser verbinden“; der
Listen-Weg „kann man gut als Schnellreise-Map benutzen“):** Startseite `#/` ist wieder die gemalte Karte, aufgeräumt:
keine Nebelwolken und Jahres-Plaketten mehr; gesperrte Städte = kleines Siegel mit ihrer Nummer auf dem Weg, Name erst
wenn offen; `RoadLines` in `King.tsx`: bisheriger Weg fein und blass, letzte Etappe kräftig gold, gepunktet zur nächsten
Stadt. Leiste unten mit 5 Knöpfen (neu: „Fast travel“). Der Listen-Weg (`KingRoad`) ist jetzt die Schnellreise `#/road`.

**Prototyp 09.11. (Lu: „Karte zu unübersichtlich … Zwischending mit Duolingo, Städte trotzdem übernehmen“):** Startseite
`#/` ist jetzt `KingRoad` in `King.tsx`: die Städte in `route()`-Reihenfolge von oben nach unten, runde Stadtbilder,
Weg schwingt Mitte/rechts/Mitte/links, Gold bis zum letzten besiegten Boss, nächste Stadt groß + pulsierend + „Start/
Continue“, gesperrte Städte blass mit „?“, Liam-Medaillon am aktuellen Ort, Wegelagerer wie auf der Karte. Oben Hoppy,
Kastanien, Sprechblase, Tagesrätsel, „Back from chess.com?“, Spiegelwelt-Karte (ab Rom). Die gemalte Weltkarte bleibt
unverändert unter `#/world` (Knopf „World map“). Stile `.road-*` in `src/king.css`. Klicktests öffnen die Karte jetzt
über `#/world`. Nicht auf dem Weg: Schatten-/Glanz-Zahlen (bleiben auf der Weltkarte).
Ursprünglicher Plan:
Gemalte Karte bleibt, dazu: goldene Linie = gereist, nummerierte Punkte = als Nächstes, Liam pulsiert am aktuellen
Ort, darunter die Straße mit den Stadtbildern und „Continue in …“. **Offen (Lu entscheidet):** `route()` springt quer
über die Karte (Rom → Bagdad → Persien → Norden → Valencia …); eine geografische Reihenfolge wäre klarer, ändert aber
die Geschichte.
