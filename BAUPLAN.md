# Bauplan King of Chess – was noch gebaut wird

> **Für Claude Code:** Diese Datei ist die Arbeitsliste. Wenn eine Sitzung beginnt oder jemand
> `/weiterbauen`, „los“, „weiter“ oder „OK“ schreibt: nimm den **ersten Punkt mit `[ ]`**, sag in
> zwei Sätzen, was du baust, und bau ihn nach den Regeln unten – ohne weitere Rückfragen, außer du
> bist wirklich blockiert. Danach: Punkt auf `[x]` setzen, committen, Vorschau deployen, kurz melden.
> Schreibt jemand „alles“, arbeitest du die Punkte nacheinander ab, jeden einzeln in die Vorschau.
> Live (Branch `main`) geht etwas erst, wenn Lu oder Johanna „übernehmen“ sagt.

Stand: 8. November 2026. Live: https://l13959733-max.github.io/chess-trainer/ ·
Vorschau: https://l13959733-max.github.io/chess-trainer/preview/

## Für Johanna: so geht's

1. Die GitHub-Einladung annehmen: https://github.com/l13959733-max/chess-trainer/invitations
2. Einmalig: `git clone https://github.com/l13959733-max/chess-trainer.git && cd chess-trainer && npm ci`
   und für die Klicktests `npm i --no-save playwright && npx playwright install chromium`
3. Claude Code im Ordner starten (`claude`) und `/weiterbauen` tippen. Claude zeigt den nächsten
   Punkt und baut ihn. Erlaubnis-Fragen mit OK bestätigen (oder Shift+Tab für „auto-accept edits“).
4. Anschauen in der Vorschau-Adresse oben. Gefällt es: „übernehmen“ schreiben, dann geht es live.

## Regeln (bei jedem Punkt)

- **Arbeiten auf dem Branch `preview`.** Prüfen mit `git branch --show-current`. Live = `main`:
  „übernehmen“ heißt `git checkout main && git merge --ff-only preview && git push`, dann zurück auf `preview`.
- **Deploy:** Ein Push auf `main` deployt automatisch beides (Live und `/preview/`). Nach einem Push
  nur auf `preview`: `gh workflow run Deploy --ref main`.
- **Prüfen vor jedem Commit:** `npx tsc -b`, `npm run lint` (Stand: 12 Warnungen, nicht mehr werden),
  `npx vitest run` (alle grün), dann im Browser: `npm run dev -- --port 5199` und
  `node scripts/e2e/king-all.mjs http://localhost:5199/ noshots` (ganzes Spiel bis zur Krone),
  `node scripts/e2e/regress.mjs http://localhost:5199/`, `node scripts/e2e/mirror.mjs`.
  Neue Eröffnungslinien: `node scripts/check-lines.mjs 16 <datei.pgn>` (nur Dateiname, ohne `data/`).
  Neue Brett-Aufgaben: `npx tsx scripts/check-rounds.mjs`. Linien aus Stockfish vorschlagen lassen:
  `node scripts/extend-line.mjs "1.e4 e5 2.f4" 8 18`.
- **Grüne Tests beweisen nichts ohne Blick ins Bild:** Bildschirmfotos (Handybreite 393 px) ansehen.
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

## Die Punkte

### [ ] 1. Kastanien-Knacken: das Gefühl für den sicheren Zug (Lus wichtigster Wunsch)
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
- **Grenze:** keine Schuldgefühle, keine Dauer-Pushs, keine Serien, die man verliert.

### [ ] 2. Waffenkammer und Schilde (Taktik, Verteidigung, Mittelspiel, Endspiel)
Im Training Camp: jede Technik ist eine Waffe (Angriff) oder ein Schild (Verteidigung) mit Bronze,
Silber, Gold. Gold nur ohne Hilfe und erst, wenn es in echten Partien klappt. Ablauf je Technik:
zeigen → mit Hilfe → frei → verteidigen → gemischt → echte Welt. Reihenfolge Taktik: Wache → Gabel →
Fesselung → Spieß → Abzug → Beseitigung des Verteidigers → Ablenkung/Hinlenkung/Überlastung → Zwischenzug
→ Kombinationen. Dazu Mattbilder, Mittelspiel (Pläne aus typischen Bauernstrukturen, Vorteil verwerten),
Endspiel (einfach → schwer, gegen Stockfish ausspielen). Aufgaben aus der Lichess-Datenbank (CC0):
`scripts/pick-lichess-puzzles.py` erzeugt `src/data/lichess-puzzles.json`; Themen dort erweitern.

### [ ] 3. Drachenhöhle (Sizilianisch Drache)
Station in der Spiegelwelt (Höhle unter dem Ätna). Der Drache ist ein Verbündeter = Läufer auf g7
(Feueratem = lange Diagonale). Quests: Feueratem, den Drachen am Leben halten (Lg7 nicht tauschen),
c-Linie und Qualitätsopfer auf c3. Boss: Drachenjäger (Jugoslawischer Angriff). Linien gibt es schon
(Kapitel „Sicilian Dragon“). Fakt nur so: Den Namen gab laut eigener Aussage Fjodor Dus-Chotimirsky
(Sternbild Drache).

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

### [ ] 8. Schnellreise aus dem Training Camp
Liste der freien Orte mit „fällig“-Zahl (Linien zum Wiederholen), Antippen = direkt dorthin.

### [ ] 9. Chronik
Freiwillig lesbare Geschichte der Meister und Eröffnungen. Nur belegte Fakten.

### [ ] 10. Atlas: „gesehen in deinen Partien“ und Wochen-Vorschlag
Je Eröffnungsfamilie der Stand gesehen / gelernt / gemeistert aus den echten Partien
(`bookReport` in `src/lib/check.ts`). Dazu „Probier diese Woche …“ mit kurzer Begründung.

### [ ] 11. Offene Welt nach der Route
Neue Regionen öffnen mit echter chess.com-Wertung (1500 / 1800 / 2000+): Rechnen, Pläne, Verwerten,
Zeit, schwere Endspiele, Meisterprüfungen. Endlose Lichess-Aufgaben in eigener Stärke, ein Rivale, der
mitwächst, Saisons, Freundes-Ligen statt öffentlicher Rangliste.

### [ ] 12. Bilder aufräumen (braucht Higgsfield-Credits, nur nach Absprache mit Lu)
Die Stadtbilder zeigen noch Liam als Prinzen (violettes Gewand, Goldreif). Lu: Straßenkind in Lumpen
„sieht zu arm aus“ → Liam in den Städten in der Kleidung seines Rangs (wie `liam-2.jpg` bis `liam-5.jpg`).
Edinburgh-Bild: Melone ist ein Zeitfehler (gab es erst ab etwa 1850).

### [ ] 13. Persönliche Linien für andere Spieler
Die App kennt nur das eingebaute Buch. Für fremde Eröffnungen aus den Partien eines Spielers mit
Stockfish im Browser eine geprüfte Linie erzeugen und als eigene Linie speichern.

### [ ] 14. Kleinigkeiten
React-Warnung im Brett (`background` und `backgroundColor` gemischt bei Letzter-Zug + Schach),
Teilen-Karte für den Bericht, `CLAUDE.md` aktuell halten.

### [ ] 15. Vor dem Play Store (Entscheidungen von Lu nötig)
Endgültiger Name (Favorit „Pawn to King“; „King of Chess“ kollidiert mit anderen Apps), Android über
Bubblewrap, **Stockfish ist GPL-3.0** (vor dem Store-Start klären), erwachsener Standard-Look.

### [ ] 16. Zugbewertung und Genauigkeit – erst testen, dann eigene Formel (Lus Wunsch 08.11.)
Vorbild chess.com: Anerkennung für gute Züge motiviert (Brilliant, Great, Good, Genauigkeit in %).
Lu vertraut fremden Formeln nicht blind → **zuerst ein Test, dann entscheidet Lu.**
Schon da: `verdict()` in `src/lib/coach.ts` (great/good/inaccuracy/mistake/blunder nach verlorener
Gewinnchance) und `winChance()` in `src/lib/bot.ts` (= Lichess-Kurve Stufe 1).

**Schritt A – Testseite `#/accuracy` (nur Vorschau):**
- Fertige chess.com-Partien laden (nur fertige – Fair Play). Analyse mit **unserem eigenen Stockfish**
  im Browser (`src/lib/engine.ts`), nicht mit dem von Lichess; Tiefe einstellbar (14 / 18).
- Pro Partie drei Zahlen nebeneinander:
  (1) chess.com-Genauigkeit, falls die Partie dort ausgewertet wurde (Feld `accuracies` im
  Partie-JSON; ergänzen in `ChessComGame`, fehlt es → „–“),
  (2) Lichess-Formel: Zug-Genauigkeit = 103.1668·exp(−0.04354·Verlust Win%) − 3.1669, Partie = Mittel
  aus gewichtetem und harmonischem Mittel,
  (3) eigene Formel, Startvorschlag: **„sichere Züge in %“** = Anteil der Züge ohne eingestellte Figur
  und ohne übersehene Drohung (`piecesInDanger` / Blunder-Grenze), passt zu Lus Hauptfehler.
- **Alles nachrechenbar:** Antippen einer Partie zeigt jeden Zug mit roher Stockfish-Bewertung →
  Gewinnchance → Genauigkeit je Formel. Keine Zahl ohne Herkunft.
- Formeln in einer eigenen Datei `src/lib/accuracy.ts` mit Vitest-Tests, damit sie austauschbar sind.

**Schritt B – nach Lus Entscheidung einbauen:**
- Zeichen pro Zug: **Brilliant (!!)** = (fast) bester Zug mit Materialopfer, der gut steht – selten,
  goldene Kastanie + Knack; dazu Best / Great / Good. Eigene Zeichen im Pergament-Stil, keine
  chess.com-Symbole oder -Farben.
- Partie-Zusammenfassung nach Bot-Partien (`Play.tsx`) und im Portal für chess.com-Partien:
  Genauigkeit (Lus Formel), Anzahl je Zeichen, „bester Zug der Partie“ zum Nachspielen,
  Verlauf über die letzten 20 Partien.
- Ehrlich: Lob und Prozente nur aus echten Engine-Werten, nie während einer laufenden chess.com-Partie.
