# Lernkonzept King of Chess

> Für Claude Code (und Johanna): Diese Datei fasst Lus Recherche vom 08.11.2026 zusammen.
> Jeder Punkt aus `BAUPLAN.md` wird so gebaut, dass er diese Prinzipien befolgt.
> Ausführliche Fassung mit allen Quellen: Claude-Dokument „King of Chess – Wie lernt man Schach am besten?“
> (https://claude.ai/artifact/FzHCQ3QoHASdSWp7qy271R, nur für Lu sichtbar).

## Die Kernsätze

Am besten lernt man Schach durch Abrufen statt Anschauen, kurz und verteilt statt lang am Stück,
gemischt statt im Block, mit Rückmeldung, die erklärt. Für Lu kommt vor allem anderen eine Gewohnheit:
vor jedem Zug die Drohung prüfen.

| Prinzip | Was es für die App heißt | Beleg |
| --- | --- | --- |
| Selbst abrufen | Linien selbst spielen, Aufgaben lösen; nie nur zeigen | Dunlosky u. a. 2013: höchste Bewertung |
| Verteilt üben | SM-2-Wiederholung (`srs.ts`), kurze tägliche Einheiten | Dunlosky u. a. 2013: höchste Bewertung |
| Mischen | Taktik gemischt, ohne Themen-Überschrift („Today's cards“) | Brunmair & Richter 2019: moderater Effekt, am stärksten beim Unterscheiden |
| Muster statt Rechnen | viele kurze Stellungen mit typischen Mustern | Chase & Simon 1973, Gobet & Simon 1996 |
| Ernsthaftes Üben allein | gezielt an der eigenen Schwäche, knapp über dem Können | Charness u. a. 2005 |
| Vormachen → ausblenden | zeigen → mit Hinweis → ohne → gemischt → echte Partie; Hilfe weniger, wenn es klappt | Worked-Example-Effekt, Expertise-Umkehr (Kalyuga) |
| Erst raten, dann erklären | vor der Erklärung kurz fragen: Was droht? Warum dieser Zug? | Selbsterklärung (Dunlosky: mittel) |
| Feedback = Information | „Good – it protects your bishop on c4“ statt nur „Great!“ | Wisniewski, Zierer & Hattie 2020: d = 0,48, Lob für die Person am schwächsten |
| Anerkennung richtig | Lob an richtiges Verhalten koppeln; Belohnungen eher überraschend; nicht „mach X, dann bekommst du Y“ | Deci, Koestner & Ryan 1999 (128 Experimente) |
| Gamification | hilft wenig, aber echt; Geschichte + Zusammenarbeit wirken am besten; ohne guten Inhalt nutzlos | Sailer & Homner 2020 |
| Gewohnheit | Knack an die Drohungsprüfung koppeln, ca. 2 Monate täglich; ein verpasster Tag schadet kaum | Lally u. a. 2010: Median 66 Tage (18–254) |

## Lus Profil (Stand Ende Oktober 2026)

- chess.com `l0o2`: Rapid ca. 574, Puzzles ca. 604. Hauptfehler laut Partie-Analyse: Drohung des Gegners nicht geprüft
  (Trainer Dan Heisman nennt das „Hope Chess“).
- Lernt am Handy, zwischen Arbeit und Projekten. Will verstehen, warum etwas richtig ist, und Zahlen nachprüfen können.
- Ziel 2000 Elo: realistisch nur über Jahre. Fortschritt darum an Zwischenzielen zeigen
  (**„sichere Züge in %“ ist seit 08.11. die Hauptkennzahl**, BAUPLAN 16), nicht nur an der Elo.

## Für andere Nutzer

- **Kinder:** kurze Einheiten, viel Vormachen, Geschichte (Liam, Hoppy), überraschende Kastanien statt angekündigter Belohnung.
- **Erwachsene Anfänger:** Sicherheitsroutine + Taktik, wenig Eröffnungstheorie; ruhiger Look (BAUPLAN 17).
- **Fortgeschrittene:** weniger Hilfe, schwerere Aufgaben, eigene Partien, Pläne, Endspiele.
- **Keine Versprechen**, dass Schach schlauer macht: Die Effekte auf Schule und Intelligenz sind klein und
  schrumpfen in sorgfältigen Studien (Sala & Gobet 2016/2017). Schach als Spiel und Freude anbieten.

## Weitere Vorschläge aus der Recherche (von Lu noch nicht entschieden – nicht bauen, nur Lu vorlegen)

1. „Erst raten, dann erklären“ als eigener Punkt (kurze Frage vor jeder Erklärung).
2. Hilfe passt sich an: Hinweise verschwinden nach drei Erfolgen ohne Hilfe, kommen nach zwei Fehlversuchen zurück.
3. Tagesserie (`streak` in `src/lib/progress.ts`) durch Wochenziel oder Schutztag ersetzen – die heutige
   Tagesserie widerspricht BAUPLAN 1 („keine Serien, die man verliert“).
4. Tagesplan nach Zeit: 5 / 15 / 30 Minuten.

## Quellen (Auswahl)

- Dunlosky u. a. 2013, Psychological Science in the Public Interest – https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html
- Brunmair & Richter 2019, Psychological Bulletin – https://pubmed.ncbi.nlm.nih.gov/31556629/
- Gobet & Simon 1996, Memory & Cognition – https://link.springer.com/content/pdf/10.3758%2FBF03200937.pdf
- Charness u. a. 2005, Applied Cognitive Psychology – https://scinapse.io/papers/2134432271
- Burgoyne u. a. 2019, American Journal of Psychology – https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf
- Salden u. a. 2010 (Fading, Expertise-Umkehr) – https://link.springer.com/doi/10.1007/s11251-009-9107-8
- Wisniewski, Zierer & Hattie 2020, Frontiers in Psychology – https://www.frontiersin.org/articles/10.3389/fpsyg.2019.03087/full
- Deci, Koestner & Ryan 2001 – https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf
- Sailer & Homner 2020, Educational Psychology Review – https://opus.bibliothek.uni-augsburg.de/opus4/files/109056/109056.pdf
- Lally u. a. 2010 – https://bps.org.uk/research-digest/how-form-habit
- Sala & Gobet 2016/2017 – https://livrepository.liverpool.ac.uk/3030311/
- Lichess-Genauigkeit – https://lichess.org/page/accuracy
