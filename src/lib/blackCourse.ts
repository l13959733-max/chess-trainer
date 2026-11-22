// Hoppy's Black training (Lu, 22.11.2026: "mach mir ein Schwarz-Training fertig mit deinem Vorschlag, wo ich beide
// Antworten lerne"): 1...d5 against everything – the Scandinavian against 1.e4, the Queen's Gambit Declined (with the
// London, 2.Nf3, Colle … lines) against 1.d4. One path: the most common lines first, 1.e4 and 1.d4 taking turns
// (mixing helps you remember), a Rush after each part, the whole system as the final test.
// Left out on purpose: "Scandinavian: 2...Nf6" and the Elephant Trap – they answer the same position with another
// move (2...Nf6 instead of 2...Qxd5, 4...Nbd7 instead of 4...Be7), and so does "Scandinavian: 3.Nc3 Qd6" (3...Qd6
// instead of 3...Qa5). One answer per position is easier to learn – the test in openingRush.test.ts checks it.
import { keyOf } from './openingRush'
import type { Line } from './pgn'

export const COURSE_E4 = 'Scandinavian'
export const COURSE_D4 = ["Queen's Gambit Declined", 'London & 2.Nf3']
export const COURSE_KEYS = {
  e4: keyOf('Scandinavian', 'b'),
  d4: COURSE_D4.map((o) => keyOf(o, 'b')).join('~'),
  all: [keyOf('Scandinavian', 'b'), ...COURSE_D4.map((o) => keyOf(o, 'b'))].join('~'),
}

export type CourseStep =
  | { kind: 'line'; title: string; vs: 'e4' | 'd4' }
  | { kind: 'rush'; key: string; title: string; need: 'star' | 'bronze' }

export const COURSE: CourseStep[] = [
  // part 1: what you meet in almost every game
  { kind: 'line', vs: 'e4', title: 'Scandinavian: 3.Nc3 Qa5 Main Line' },
  { kind: 'line', vs: 'd4', title: 'London System (Black)' },
  { kind: 'line', vs: 'e4', title: 'Scandinavian: 3.Nf3' },
  { kind: 'line', vs: 'd4', title: '1.d4 d5 2.Nf3 (Black)' },
  { kind: 'line', vs: 'e4', title: 'Scandinavian: 3.d4' },
  { kind: 'line', vs: 'd4', title: 'QGD: Orthodox 4.Bg5' },
  { kind: 'rush', key: COURSE_KEYS.e4, title: 'Rush: against 1.e4', need: 'star' },
  // part 2: the other main moves
  { kind: 'line', vs: 'd4', title: 'QGD: 3.Nc3 Nf6 4.Nf3' },
  { kind: 'line', vs: 'e4', title: 'Scandinavian: 3.Nc3 Qa5 4.Nf3' },
  { kind: 'line', vs: 'd4', title: 'QGD: Exchange Variation' },
  { kind: 'line', vs: 'e4', title: 'Scandinavian: 2.e5' },
  { kind: 'line', vs: 'd4', title: 'QGD: 3.Nf3 and 5.Bf4' },
  { kind: 'rush', key: COURSE_KEYS.d4, title: 'Rush: against 1.d4', need: 'star' },
  // part 3: the rarer tries
  { kind: 'line', vs: 'e4', title: 'Scandinavian: 2.Nc3' },
  { kind: 'line', vs: 'd4', title: 'vs the Colle 2.e3' },
  { kind: 'line', vs: 'e4', title: 'Scandinavian: 3.Nc3 Qa5 4.Bc4' },
  { kind: 'line', vs: 'd4', title: 'QGD: vs the Catalan 4.g3' },
  { kind: 'line', vs: 'e4', title: 'Scandinavian: Blackmar-Diemer Gambit 2.d4' },
  { kind: 'line', vs: 'd4', title: 'vs 2.Nc3 3.Bf4 (Jobava)' },
  { kind: 'line', vs: 'e4', title: 'Scandinavian vs 2.d3' },
  { kind: 'line', vs: 'd4', title: 'vs 2.Nc3 3.Bg5 (Veresov)' },
  { kind: 'line', vs: 'd4', title: 'vs the Levitsky 2.Bg5' },
  // the final test: everything, mixed
  { kind: 'rush', key: COURSE_KEYS.all, title: 'The whole 1...d5 system', need: 'bronze' },
]

// the Black line of a step (by its title), or undefined when the repertoire does not have it
export const courseLine = (lines: Line[], title: string) => lines.find((l) => l.side === 'b' && l.source !== 'import' && l.title === title)
