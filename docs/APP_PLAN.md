# Hoppy – Gesamtplan (Prompt)

> **Für Claude Code:** Das ist der Bauplan für den Umbau der ganzen App. Lu und Claude füllen ihn **zusammen**
> aus („erstmal zusammen Prompt ready, dass dann die ganze App durchgeplant ist" – Lu, 27.11.2026).
> **Erst bauen, wenn Lu „Plan fertig" oder „bauen" sagt.** Dann alles nach diesem Plan in der Vorschau
> (`preview`) bauen, am Handy-Format prüfen, Lu den Link geben. Live erst nach „übernehmen".
> Punkte mit **❓** sind offen und werden mit Lu geklärt, nicht geraten.
> Struktur v2 ist seit 27.11. abends IN DER VORSCHAU-APP selbst gebaut (`src/screens/Sections.tsx`, `components/DuoBar.tsx`) – live erst nach „übernehmen". `#/proto` leitet auf die Startseite. Statistik-Prototyp https://claude.ai/artifact/LFtPR87zyiq4gQo7jeqcru

## 0. Grundregeln (gelten überall)

- **Duolingo-Stil bleibt.** Weiß, runde Schrift Nunito, dicke 3D-Knöpfe, Karten mit grauer Kante (`src/brand.css`).
- **Kein lila Knopf in der Mitte, kein Mittelknopf überhaupt** (Lu, 25.11.).
- Nichts geht verloren, nichts ist doppelt. Gute Bedienung.
- Neue Gestaltung erst als Prototyp zeigen, nicht ungefragt in die echte Navigation bauen.

## Struktur v2 (27.11.) – GILT

Lu, 27.11.: „Das unter Training wieder Weiß und Schwarz ist ja wieder gedoppelt. Weiß soll alles, was unter weißem
Training ist, laufen, unter Schwarz alles, was unter schwarzem Training läuft. Dann kommt der Punkt Training weg."
Das Gemischte bekommt einen eigenen Punkt „Heute" (Lus Wahl).

- **Leiste: 5 Symbole** 🔥 Heute · ♔ Weiß · ♚ Schwarz · 📊 Entwicklung · 🧭 Geschichte (Duolingo-Leiste aus
  Prototyp A: nur Symbole, aktives im hellblauen Kästchen, graue Linie oben, kein Mittelknopf).
- **Kein Punkt „Training"** mehr, keine Ebene über Weiß/Schwarz.
- **🔥 Heute = Start** (App öffnet hier): kleine Reise-Leiste als Gimmick, Woche als Flammen und **EINE kurze
  Einheit von höchstens 5 Minuten** (Lu, 27.11.: „Im Today ist zu viel, das macht man nicht an einem Tag – höchstens
  fünf Minuten Material"): 🎯 Threat Check (1) · 🩹 ein eigener Fehler (1) · 🗺 bis zu 2 fällige Linien, sonst 1 neue
  (2) · 💥 Square Rush (1) → „Done for today". Mehr = ♔ Weiß / ♚ Schwarz. Zugeklappt „More to play": Puzzle Rush,
  Armoury, Today's cards, der lange Tagespfad (nichts verloren).
- **♔ Weiß / ♚ Schwarz** = eigene Punkte, Inhalt siehe nächster Abschnitt.
- **📊 Entwicklung** = Statistik aus dem Prototyp (`ProgressViz`), oben „Analyse aktualisieren".
- **🧭 Geschichte** = Weltkarte, Städte, Meister, Tagebuch, Spiegelwelt („ein bisschen Geschichte ist schon nice",
  „cooles Gimmick, nicht die Hauptattraktion").
- **Profil = rundes Bild oben rechts**: Name, chess.com-Konto, Ton, Look, Trophäen, Together.
- Ersetzt Struktur v1 (Training mit Weiß/Schwarz/Gemischt darunter) und die älteren Abschnitte 1 und 2.

## ♔ Weiß / ♚ Schwarz (das Herzstück, je ein eigener Punkt)

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

**Eröffnung antippen → eigene Seite `#/opening/<Kapitel>`** (Lu, 27.11.: „wenn ich die Eröffnungen auswähle, will
ich, dass da mein Ablauf kommt und die Geschichte"): oben die Geschichte (Stadt/Spiegelwelt-Ort, der diese
Eröffnung erzählt, „Read" → Stadtkapitel) + worum es geht (`lib/guide.ts`), darunter **dein Pfad** (`ChapterPath`):
jede Linie lernen/spielen, nach je 3 Linien ein Rush, am Ende Rush als Abschlusstest (Bronze-Gürtel). Nach einer
Linie führt „Overview" zurück auf diese Seite.

**Aufgeräumt + Eröffnungs-Statistik (Lu, 27./28.11.):** Opening Rush, Surprise me, What to play when, Atlas und
All openings waren auf Weiß/Schwarz doppelt → raus. Stattdessen: jede Eröffnungskarte zeigt „X von Y Linien gelernt"
(Balken), den Atlas-Satz „für wen" und die echte Bilanz aus chess.com-Partien (Siegquote, Partien, Fehler/Partie;
Zuordnung Partie → Kapitel über die längste Übereinstimmung mit deinen Linien, `bestChapter`, getestet). Eine Karte
„Test all White/Black openings" (Rush gemischt). Eröffnungs-Seite: Statistik-Karte (S/R/N-Balken, Fehler/Partie,
letzte 5, häufigste Fehlerart) + „Zufällige Linie". Ganzes Buch, PGN-Import, Tagesziel → Profil.

**Deine letzte Partie `#/last-game`** (Lu, 28.11.: „mein letztes Game per Elo geratet, Tipps, erklärt warum Sachen
nicht gut sind"), Karte oben auf 📊 Entwicklung: eine der letzten 5 Partien wählen, Stockfish prüft jeden Zug
(gespeichert), Genauigkeit beider, Zähler, Tipps aus den Fehlerarten, Schlüsselmomente (warum schlecht, besserer
Zug, Brett zum Nachspielen). **Keine Elo pro Partie:** gemessen an 2.268 Spieler-Partien – eine Partie sagt fast
nichts über die Elo (Korrelation 0,16). Stattdessen „besser als X von 100 Partien von Spielern deiner Stufe"
(`lib/gameLevel.ts`, Tabelle aus echten Daten). Knopf „Practise these mistakes" (28.11.): Fehler + grobe Fehler werden normale Aufgaben (gleiche ID wie beim
Analysieren → nie doppelt), Runde `#/puzzles/game/<uuid>`, danach in den Wiederholungen. Option später: „Form-Elo" über viele Partien; Claude-Erklärsätze
(Modul 3, braucht Cloudflare + API-Schlüssel).

**Farblos → 🔥 Heute** (siehe Struktur v2). Begründung für den gemischten Tagespfad: `docs/LERNKONZEPT.md` –
„vor jedem Zug die Drohung prüfen" ist Lus wichtigste Gewohnheit (bleibt Level 1); Mischen wirkt. Nutzungszahlen
gibt es keine (die App zählt nicht mit) → Abwägung, keine Messung.

## 1. (ÄLTERER STAND, ersetzt durch Struktur v2) Startseite

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

## 2. (ÄLTERER STAND, ersetzt durch Struktur v2) Leiste unten

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

- **28.11.2026: LIVE übernommen (main=1431e17)** – Struktur v2, Weiß/Schwarz mit Eröffnungs-Statistik, Eröffnungs-Seite, Heute 5 Min., Entwicklung + Analysen vorne, Deine letzte Partie + Fehler üben. Nächstes: Together-Prototypen (Lu: „weiß ich noch nicht, erst Prototypen").

- 27.11.2026: Plan angelegt mit Lus Vorgaben zu Startseite und Leiste.
- 27.11.2026: Journey-Karte öffnet die Progress-Seite aus dem Prototyp.
- 27.11.2026: Struktur-Vorschlag v1 (3 Symbole, Training = Start, Profil oben rechts) – Lu: ok.
- 27.11.2026: Weiß/Schwarz lernen beschrieben (alles einer Farbe an einem Ort, animierte Liste).
- 27.11.2026: Nicht zu viel: Training-Seite nur 3 Karten (verworfen).
- 27.11.2026: Struktur v2: Training weg, Weiß und Schwarz eigene Punkte, Gemischtes = 🔥 Heute (5 Symbole).
- 27.11.2026 abends: Lu sah in der Vorschau die alte Leiste („die Home site ist weg … nicht der neue Balken") → v2 in die Vorschau-App eingebaut: Startseite (Hoppy-Bild) bleibt 🔥, neue Leiste überall, Zitat-Karte weiß, Square Rush schwarz; Seiten #/today #/white #/black #/progress #/story #/profile; Schwarz-System jetzt #/black-system.
- 27.11.2026: Eröffnung → eigene Seite mit Geschichte + Pfad; Heute = höchstens 5 Minuten (4 Schritte).
- 27.11.2026: Prototyp v2 in der Vorschau `#/proto` gebaut (Lu: „bau jetzt erstmal den Prototypen"). Neu dafür: Farb-Filter `#/puzzles/color/w|b`, `#/threats/color/w|b`, `#/play/w|b`.
