# Hoppy – Gesamtplan (Prompt)

> **Für Claude Code:** Das ist der Bauplan für den Umbau der ganzen App. Lu und Claude füllen ihn **zusammen**
> aus („erstmal zusammen Prompt ready, dass dann die ganze App durchgeplant ist" – Lu, 27.11.2026).
> **Erst bauen, wenn Lu „Plan fertig" oder „bauen" sagt.** Dann alles nach diesem Plan in der Vorschau
> (`preview`) bauen, am Handy-Format prüfen, Lu den Link geben. Live erst nach „übernehmen".
> Punkte mit **❓** sind offen und werden mit Lu geklärt, nicht geraten.
> Prototypen zum Nachschauen: Vorschau `#/proto` (A/B/C), Statistik-Prototyp https://claude.ai/artifact/LFtPR87zyiq4gQo7jeqcru

## 0. Grundregeln (gelten überall)

- **Duolingo-Stil bleibt.** Weiß, runde Schrift Nunito, dicke 3D-Knöpfe, Karten mit grauer Kante (`src/brand.css`).
- **Kein lila Knopf in der Mitte, kein Mittelknopf überhaupt** (Lu, 25.11.).
- Nichts geht verloren, nichts ist doppelt. Gute Bedienung.
- Neue Gestaltung erst als Prototyp zeigen, nicht ungefragt in die echte Navigation bauen.

## Struktur v1 (27.11.) – von Lu bestätigt

Lu, 27.11.: „Das Hauptding ist: man lernt Schwarz und Weiß, hat die Analyse und kann trainieren." Die Weltkarte
„soll ein cooles Gimmick sein, aber nicht die Hauptattraktion". Geschichte gefällt, Entwicklung und Training braucht
es auf jeden Fall. „Wie bringen wir das smart unter alles?"

- **Leiste: nur 3 Symbole** ♟ Training · 📊 Entwicklung · 🧭 Geschichte (Duolingo-Leiste aus Prototyp A,
  hellblaues Kästchen, kein Mittelknopf, kein Start-, kein Profil-Knopf).
- **♟ Training = Start** (App öffnet hier): oben kleine Reise-Leiste als Gimmick („🐴 Samarkand → Rom · noch 3 Level",
  jede gelernte Linie bringt Hoppy weiter, Tipp → Geschichte); große Karten ♔ Weiß lernen (weiß) · ♚ Schwarz lernen
  (schwarz) · 🔀 Gemischt (grün = Tagespfad/alles Fällige); darunter klein: Threat Check, Square Rush, Puzzle Rush,
  Hoppy-Bot.
- **📊 Entwicklung** = Statistik aus dem Prototyp (`ProgressViz`), oben „Analyse aktualisieren".
- **🧭 Geschichte** = Weltkarte, Städte, Meister, Tagebuch, Spiegelwelt.
- **Profil = rundes Bild oben rechts**: Name, chess.com-Konto, Ton, Look, Trophäen, Together.
- ✅ Lu, 27.11.: „ok". Abschnitte 1 und 2 unten sind ältere Stände (Startseite mit Hoppy-Bild, 4 Symbole) – ersetzt.

## Weiß lernen / Schwarz lernen (das Herzstück)

Lu, 27.11.: „Schwarz und Weiß lernen = da kommen jeweils die weißen Openings, bei Schwarz die schwarzen, die ganzen
Taktiken, das Training, alles was zu dem Themenbereich gehört." Darstellung: **animierte Liste aus dem Prototyp**
(`components/AnimatedList.tsx`, Thema `duo`), in Gruppen sortiert. Seite in der Farbe: Weiß = weiße Seite,
Schwarz = schwarze Seite.

**♔ Weiß lernen**
1. Deine Eröffnungen: jede Weiß-Eröffnung (Kapitel aus `lib/chapters.ts`, Linien mit `side === 'w'`) mit Fortschritt
   („5 von 9 Linien", „3 fällig") → Lernen/Drill; Opening Rush Weiß; Überrasch mich (`#/surprise/w`); Was spiele ich
   wann? (`#/map/w`). *Gibt es schon, nur verstreut.*
2. Taktik & Fehler: deine Fehler aus Weiß-Partien, Drohungen aus Weiß-Partien, Schatzkiste mit Weiß, Angriffe &
   Fallen mit Weiß (`#/attacks`, Seite pro Linie). *Fehler/Drohungen/Schatzkiste: neuer Farb-Filter über
   `Puzzle.myColor` – Daten sind da.*
3. Spielen: Hoppy-Bot als Weiß; Deine Gewohnheiten (wo du mit Weiß das Buch verlässt).
4. Kurz-Statistik: Siegquote mit Weiß, beste und schwierigste Weiß-Eröffnung → Tipp öffnet Entwicklung › Openings › Weiß.

**♚ Schwarz lernen** – gleich aufgebaut, plus: Schwarz-System wählen (`#/black`), Hoppys Schwarz-Training
(`#/black-course`), Opening Rush Schwarz, **Spiegelwelt** (Geschichte, Akt 2 = Schwarz).

**Farblos → 🔀 Gemischt** (Lu, 27.11.: „wir müssen genau gucken, was zu viel ist"):
- Training-Seite zeigt NUR Reise-Leiste + drei große Karten ♔ Weiß · ♚ Schwarz · 🔀 Gemischt – keine Extra-Kacheln.
- 🔀 Gemischt = Tagespfad (`lib/trainingPath.ts`: Level 1 ist IMMER der Threat Check, dazu Fehler, fällige Linien,
  Lektion, Square Rush, Schatzkiste, Boss) + Today's cards.
- Darunter in Gemischt „Freies Spielen": Threat Check, Square Rush, Puzzle Rush, Hoppy-Bot, Armoury.
- Begründung: `docs/LERNKONZEPT.md` – „vor jedem Zug die Drohung prüfen" ist Lus wichtigste Gewohnheit (bleibt Level 1);
  Mischen wirkt. Nutzungszahlen gibt es keine (die App zählt nicht mit) → Abwägung, keine Messung.
- Geschichte: eigener 🧭-Tab + kleine Reise-Leiste = „ein bisschen" (Lu: „ein bisschen Geschichte ist schon nice").

## 1. Startseite (erste Seite)

Lu, 27.11.: „Das soll die erste Seite bleiben."

- Bleibt wie jetzt: oben Begrüßung + Flamme + Kastanien, großes Hoppy-Bild mit „Continue", darunter vier Karten.
- **Karte „A king is not born …" (oben links): WEISS** statt lila.
- **Karte „Square Rush" (unten rechts, diagonal darunter): SCHWARZ** statt dunkellila.
- **Karte „Journey" (oben rechts): hier kommt „unsere ganze Entwicklung"** (Lu, 27.11.).
  - ✅ Geklärt (Lu, 27.11., mit Screenshot von `#/proto` → Progress): **Die Karte öffnet die Progress-Seite aus
    dem Prototyp** („das ist gut, das kann da") = `components/ProgressViz.tsx` mit Zeitraum (4 Wochen / 3 Monate /
    Everything), Reitern Overview · Mistakes · Openings · Habits, Hoppy-Satz, 4 Kennzahlen mit Trend,
    besser/schlechter, Rating-Kurve, sichere Züge. Ersetzt die bisherige Seite `#/progress`.
- Karte „Daily · Threat Check" (unten links): bleibt.

## 2. Leiste unten

Lu, 27.11.: „unten der Balken aus der neuen Version" (= Prototyp A).

- Nur Symbole, keine Beschriftung: 🔥 · 🧭 · 📊 · 👤. Aktives Symbol im hellblauen Kästchen, graue Linie oben.
- Kein Mittelknopf, kein Home-Knopf.
- ❓ Was öffnen die vier Symbole genau? Vorschlag:
  - 🔥 = **diese Startseite** (sie ist „Today" – sonst gäbe es keinen Weg zurück zur ersten Seite)
  - 🧭 = Journey (Weltkarte / Städte)
  - 📊 = Progress (visuelle Statistik)
  - 👤 = Profil (Settings, Trophäen, Tagebuch, Together, weitere Welten)
  - Wohin dann die heutige Daily-Seite (Woche, Tagespfad, alle Trainer)?

## 3. Journey

- ❓ offen (Weltkarte, Städte, Geschichte – wie im Prototyp mit großem Stadtbild oben?)

## 4. Progress / Entwicklung

- Visuell, nicht als Liste (Lu, 27.11.: „Statistik … visuell darstellen, alles"). Basis: Statistik-Prototyp
  (`components/ProgressViz.tsx`): Hoppy-Satz, 4 Kennzahlen mit Trend, besser/schlechter (Fehler pro 10 Partien),
  Rating, sichere Züge, Fehler wo/welche/wann/Uhr, Eröffnungen, Gewohnheiten. Nur echte Daten.
- ❓ offen: Was fehlt, was ist zu viel? „Other kinds" (größte Fehlerart) aufschlüsseln?

## 5. Training / Daily

- ❓ offen (Prototyp: Wochen-Flammen, grüne Tagespfad-Karte, Gruppen Now · Quick games · Learn & train)

## 6. Profil

- ❓ offen (Prototyp: Gruppen You · Together · More worlds)

## 7. Übungsseiten (Brett, Rätsel, Rush, Lektionen)

- ❓ offen

## Verlauf

- 27.11.2026: Plan angelegt mit Lus Vorgaben zu Startseite und Leiste.
- 27.11.2026: Journey-Karte öffnet die Progress-Seite aus dem Prototyp.
- 27.11.2026: Struktur-Vorschlag v1 (3 Symbole, Training = Start, Profil oben rechts) – Lu: ok.
- 27.11.2026: Weiß/Schwarz lernen beschrieben (alles einer Farbe an einem Ort, animierte Liste).
- 27.11.2026: Nicht zu viel: Training-Seite nur 3 Karten; Threat Check/Square Rush/Puzzle Rush in Gemischt (wartet auf Lus OK).
