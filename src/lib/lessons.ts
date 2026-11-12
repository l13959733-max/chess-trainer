import { Chess } from 'chess.js'

// Short lessons in the style Lu picked on 13.11. (prototype "Hoppy Mix"): one question per screen, you answer ON the
// board, the explanation comes after your answer, Hoppy's face reacts in a sheet at the bottom. A good move that is
// not today's topic ("meh") is praised and never counted as a mistake. After the lesson Hoppy writes a line into his
// diary (shown on the start page). Every position is built from real moves, checked in lessons.test.ts.

export interface Say {
  title: string
  text: string
  arrows?: [string, string, ('good' | 'idea')?][]
  good?: string[] // squares lit green
}
export interface Other extends Say {
  kind: 'meh' | 'bad' // meh = a good move, just not today's topic (no mistake); bad = a mistake
}

interface Base {
  moves: string // the position: the moves from the start, e.g. "1.e4 e5 2.Nf3 Nc6"
  prompt: string
  hint: string
  focus?: string[] // squares outlined from the start
  arrows?: [string, string, ('good' | 'idea')?][]
}
// play a move with today's piece
export interface MoveStep extends Base {
  kind: 'move'
  piece: string // the square of today's piece
  answer: string // SAN
  ok: Say
  others?: Record<string, Other> // SAN → what Hoppy says
  wrong: string // today's piece on any other square
  offTask: string // a move with another piece that has no text of its own: only a hint, no mistake
}
// tap a piece on the board
export interface TapStep extends Base {
  kind: 'tap'
  side: 'w' | 'b'
  type?: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
  answer: string
  ok: Say
  wrongs?: Record<string, string>
  wrong: string
  notThis: string // tapped something that is not even a candidate (empty square, wrong colour …)
}
// pick one answer
export interface ChoiceStep extends Base {
  kind: 'choice'
  options: { t: string; ok?: boolean; why?: string }[]
  ok: Say
}
export type LessonStep = MoveStep | TapStep | ChoiceStep

export interface Lesson {
  id: 'diagonal' | 'aimf7'
  station: string
  eyebrow: string
  minutes: number
  steps: LessonStep[]
  diary: string // Hoppy's diary line after the lesson
}

export const LESSONS: Record<Lesson['id'], Lesson> = {
  diagonal: {
    id: 'diagonal',
    station: 'barcelona',
    eyebrow: 'Catalan · the long diagonal',
    minutes: 2,
    diary: 'From g2 my bishop sees all the way to a8. Only b7 stands in the way.',
    steps: [
      {
        kind: 'move',
        moves: '1.d4 Nf6 2.c4 e6 3.g3 d5',
        prompt: 'Black built a wall with …d5. Where does your bishop look down the long diagonal?',
        hint: 'Tap the bishop on f1, then its square.',
        piece: 'f1',
        answer: 'Bg2',
        ok: { title: '4.Bg2 – the Catalan bishop', text: 'It looks down g2–a8. Right now the d5-pawn blocks the view. Keep watching that pawn.', arrows: [['g2', 'd5']] },
        others: {
          Bh3: { kind: 'bad', title: 'Wrong diagonal', text: 'From h3 the bishop only hits the e6-pawn. The long diagonal starts on g2.', arrows: [['h3', 'e6']] },
          Nf3: { kind: 'meh', title: 'Good move – just not today', text: '4.Nf3 is a normal Catalan move too. Today we practise the bishop first. This does not count as a mistake.' },
          Nc3: { kind: 'meh', title: 'Good move – just not today', text: '4.Nc3 is a good Queen’s Gambit move. Today we practise the Catalan bishop. This does not count as a mistake.' },
        },
        wrong: 'From there the bishop does not look down the long diagonal.',
        offTask: 'Today it’s the bishop’s turn (f1).',
      },
      {
        kind: 'tap',
        moves: '1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4',
        prompt: 'Black takes: 4…dxc4. The diagonal is open. Which black pawn does the bishop hit now?',
        hint: 'Tap the pawn.',
        side: 'b',
        type: 'p',
        answer: 'b7',
        ok: { title: 'Exactly, b7!', text: 'f3, e4, d5 and c6 are all empty now. The bishop presses on b7 from far away.', arrows: [['g2', 'b7']], good: ['b7'] },
        wrongs: { c4: 'That’s the pawn Black just won. It is not on the bishop’s line.' },
        wrong: 'Follow the line from g2: f3, e4, d5, c6 … which pawn is the first one on it?',
        notThis: 'Tap one of Black’s pawns.',
      },
      {
        kind: 'choice',
        moves: '1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4',
        prompt: 'If the b7-pawn ever moves, what does the g2-bishop hit next?',
        hint: 'Pick one answer.',
        focus: ['b7'],
        arrows: [['g2', 'b7', 'idea']],
        options: [
          { t: 'The rook on a8', ok: true },
          { t: 'The queen on d8', why: 'd8 is not on the long diagonal. The squares are g2, f3, e4, d5, c6, b7, a8.' },
          { t: 'The king on e8', why: 'e8 is not on the long diagonal. The squares are g2, f3, e4, d5, c6, b7, a8.' },
        ],
        ok: { title: 'The rook in the corner', text: 'That’s why Black has to be careful with b7. In the Catalan the bishop on g2 keeps this pressure for a long time.', arrows: [['g2', 'a8', 'good']], good: ['a8'] },
      },
    ],
  },
  aimf7: {
    id: 'aimf7',
    station: 'rome',
    eyebrow: 'Italian Game · aim at f7',
    minutes: 2,
    diary: 'Only the king guards f7 at the start. That’s why so many early traps land there!',
    steps: [
      {
        kind: 'tap',
        moves: '1.e4 e5 2.Nf3 Nc6',
        prompt: 'Black just played 2…Nc6. Which white piece is attacking e5?',
        hint: 'Tap the piece on the board.',
        focus: ['e5'],
        side: 'w',
        answer: 'f3',
        ok: { title: 'Spot on!', text: 'The knight on f3 hits e5. That is why Black defended it with 2…Nc6.', arrows: [['f3', 'e5']], good: ['f3'] },
        wrong: 'That piece can’t reach e5. Which piece jumps there in one move?',
        notThis: 'Tap one of your own (white) pieces.',
      },
      {
        kind: 'move',
        moves: '1.e4 e5 2.Nf3 Nc6',
        prompt: 'Your move. Put the bishop where it aims at f7.',
        hint: 'Tap the bishop, then its square.',
        piece: 'f1',
        answer: 'Bc4',
        ok: { title: 'That’s the Italian Game', text: '3.Bc4: the bishop now looks straight at f7.', arrows: [['c4', 'f7']] },
        others: {
          Bb5: { kind: 'meh', title: 'That’s the Ruy Lopez', text: 'Also a top move! Today we practise the Italian. Find the square that aims at f7.', arrows: [['b5', 'c6']] },
          Be2: { kind: 'bad', title: 'Not this time', text: 'Safe, but quiet. From e2 the bishop doesn’t look at f7.' },
          Bd3: { kind: 'bad', title: 'Not this time', text: 'It blocks your d-pawn, so your c1-bishop gets stuck.' },
          Ba6: { kind: 'bad', title: 'Ouch', text: 'The b7-pawn simply takes it.' },
          d4: { kind: 'meh', title: 'Good move – just not today', text: '3.d4 is the Scotch Game, a good opening too. Today we practise the Italian bishop.' },
          Nc3: { kind: 'meh', title: 'Good move – just not today', text: '3.Nc3 develops a piece, that’s fine. Today we practise the Italian bishop.' },
        },
        wrong: 'From there the bishop does not aim at f7.',
        offTask: 'Today it’s the bishop’s turn (f1).',
      },
      {
        kind: 'choice',
        moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
        prompt: 'Why do both sides care so much about f7?',
        hint: 'Pick one answer.',
        focus: ['f7'],
        arrows: [['c4', 'f7', 'idea']],
        options: [
          { t: 'Only the king defends it', ok: true },
          { t: 'It is the pawn in front of the queen', why: 'That’s the d7-pawn. The queen stands on d8.' },
          { t: 'It is not allowed to move yet', why: 'It can move: …f6 and …f5 are both legal.' },
        ],
        ok: { title: 'Exactly!', text: 'At the start only the king guards f7. That is why so many early traps, like Scholar’s Mate, land on f7.', arrows: [['c4', 'f7'], ['e8', 'f7', 'good']] },
      },
    ],
  },
}

export function lessonOf(station: string): Lesson | undefined {
  return Object.values(LESSONS).find((l) => l.station === station)
}

// "1.e4 e5 2.Nf3" → FEN after these moves (throws on an illegal move, the test checks every lesson)
export function fenAfter(moves: string): string {
  const c = new Chess()
  for (const t of moves.split(/\s+/)) {
    const san = t.replace(/^\d+\.(\.\.)?/, '')
    if (san) c.move(san)
  }
  return c.fen()
}

// ---------- Hoppy's diary (start page) ----------
export interface DiaryEntry {
  id: string // the lesson
  city: string
  text: string
  at: number
}
const DIARY = 'hoppy-diary'
export function loadDiary(): DiaryEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(DIARY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
// newest first; a lesson writes its line only once
export function writeDiary(e: DiaryEntry): void {
  const all = loadDiary()
  if (all.some((x) => x.id === e.id)) return
  try {
    localStorage.setItem(DIARY, JSON.stringify([e, ...all].slice(0, 30)))
  } catch {
    // not saved
  }
}
export function when(at: number, now = Date.now()): string {
  const day = (t: number) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 86400000)
  const d = day(now) - day(at)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}
