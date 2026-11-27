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

## 1. Startseite (erste Seite)

Lu, 27.11.: „Das soll die erste Seite bleiben."

- Bleibt wie jetzt: oben Begrüßung + Flamme + Kastanien, großes Hoppy-Bild mit „Continue", darunter vier Karten.
- **Karte „A king is not born …" (oben links): WEISS** statt lila.
- **Karte „Square Rush" (unten rechts, diagonal darunter): SCHWARZ** statt dunkellila.
- **Karte „Journey" (oben rechts): hier kommt „unsere ganze Entwicklung"** (Lu, 27.11.).
  - ❓ Heißt das: (a) die Karte selbst zeigt die Entwicklung (z. B. kleine Rating-Kurve + „+103 seit Juni"),
    (b) die Karte öffnet die visuelle Statistik-Seite (Prototyp Progress), oder (c) beides?
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
