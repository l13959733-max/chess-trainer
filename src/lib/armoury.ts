// The armoury (BAUPLAN 2): every technique is a weapon (use it) and a shield (see it coming).
// Each one goes the same way: show → with help → alone → defend → mixed → real world.
// Bronze after the help round, silver after alone + defend, gold only without help in the mixed
// round AND in real chess.com games afterwards. Puzzles come from the Lichess database (CC0).
import type { GameRecord, Puzzle } from './db'
import type { Category } from './weakness'

export type Kind = 'tactic' | 'mate' | 'middle' | 'end'

export interface Technique {
  id: string
  kind: Kind
  name: string
  icon: string
  theme: string // key in src/data/lichess-puzzles.json
  weapon: string // how you use it
  shield: string // how you see it coming
  real?: Category[] // the mistakes in your real games that this technique is about
}

export const KINDS: { kind: Kind; title: string; about: string }[] = [
  { kind: 'tactic', title: 'Tactics', about: 'Weapons to win material – and the shield against each of them.' },
  { kind: 'mate', title: 'Mating patterns', about: 'Pictures of checkmate. Once you know them, you see them in a flash.' },
  { kind: 'middle', title: 'Middlegame', about: 'Turn an advantage into a win, and hold on when you are attacked.' },
  { kind: 'end', title: 'Endgame', about: 'From simple to hard. Few pieces, exact moves.' },
]

// In this order: each one opens when the one before has its bronze medal
export const TECHNIQUES: Technique[] = [
  { id: 'guard', kind: 'tactic', name: 'The guard', icon: '🛡', theme: 'hanging', weapon: 'Take what is not protected.', shield: 'Before you let go of a piece: who attacks that square, who protects it?', real: ['hung-piece', 'free-piece'] },
  { id: 'fork', kind: 'tactic', name: 'Fork', icon: '🍴', theme: 'fork', weapon: 'One piece attacks two things at once – only one can be saved.', shield: 'Look at every square from which an enemy piece could attack two of yours.', real: ['tactic', 'missed-tactic'] },
  { id: 'pin', kind: 'tactic', name: 'Pin', icon: '📌', theme: 'pin', weapon: 'Attack a piece that cannot move, because something bigger stands behind it.', shield: 'When your piece stands in a line with your king or queen, check for bishops, rooks and queens on that line.', real: ['tactic', 'missed-tactic'] },
  { id: 'skewer', kind: 'tactic', name: 'Skewer', icon: '🗡', theme: 'skewer', weapon: 'Attack the big piece in front; when it moves, take the one behind.', shield: 'Do not leave your king and another piece on the same open line.', real: ['tactic', 'missed-tactic'] },
  { id: 'discovered', kind: 'tactic', name: 'Discovered attack', icon: '🚪', theme: 'discovered', weapon: 'Move one piece out of the way – and the piece behind it attacks.', shield: 'Watch enemy pieces that stand in front of their own bishops, rooks or queen.', real: ['tactic', 'missed-tactic'] },
  { id: 'removal', kind: 'tactic', name: 'Remove the defender', icon: '🪓', theme: 'removal', weapon: 'Take the piece that protects – then what it protected falls.', shield: 'Know which of your pieces is the only guard of another.', real: ['left-undefended', 'missed-tactic'] },
  { id: 'deflection', kind: 'tactic', name: 'Deflection', icon: '↪', theme: 'deflection', weapon: 'Pull a defender away from its job with a check or a capture.', shield: 'When a piece of yours has an important job, do not let it be lured away.', real: ['left-undefended', 'missed-tactic'] },
  { id: 'attraction', kind: 'tactic', name: 'Decoy', icon: '🧲', theme: 'attraction', weapon: 'Lure a piece – often the king – onto a bad square, then strike.', shield: 'A free piece next to your king can be bait. Ask why it is offered.', real: ['tactic', 'missed-tactic'] },
  { id: 'intermezzo', kind: 'tactic', name: 'In-between move', icon: '⏸', theme: 'intermezzo', weapon: 'Before you take back, look for a stronger move in between – a check or a threat.', shield: 'After a trade, do not assume the recapture: your opponent may have a check first.', real: ['tactic', 'missed-tactic'] },
  { id: 'combo', kind: 'tactic', name: 'Combinations', icon: '✨', theme: 'combo', weapon: 'Give material on purpose when the moves after it win more.', shield: 'When your opponent gives you something, look one move further.', real: ['tactic', 'missed-tactic'] },
  { id: 'mate1', kind: 'mate', name: 'Mate in one', icon: '♚', theme: 'mate1', weapon: 'Look at every check first – one of them might be mate.', shield: 'Find every check your opponent has after your move.', real: ['allowed-mate', 'missed-mate'] },
  { id: 'backrank', kind: 'mate', name: 'Back-rank mate', icon: '🧱', theme: 'backrank', weapon: 'A rook or queen on the last rank, the king walled in by its own pawns.', shield: 'Give your king air (a pawn move like h3) before it is too late.', real: ['allowed-mate', 'missed-mate'] },
  { id: 'smothered', kind: 'mate', name: 'Smothered mate', icon: '🐴', theme: 'smothered', weapon: 'A knight mates a king that is boxed in by its own pieces.', shield: 'Keep a square free next to your king when enemy knights come close.', real: ['allowed-mate', 'missed-mate'] },
  { id: 'arabian', kind: 'mate', name: 'Arabian mate', icon: '🐪', theme: 'arabian', weapon: 'Rook and knight together trap the king in the corner.', shield: 'A king in the corner with an enemy knight near needs an escape square.', real: ['allowed-mate', 'missed-mate'] },
  { id: 'anastasia', kind: 'mate', name: "Anastasia's mate", icon: '🌙', theme: 'anastasia', weapon: 'A knight blocks the king\'s escape, the rook or queen mates on the edge file.', shield: 'Watch the open h-file when your king sits on the edge.', real: ['allowed-mate', 'missed-mate'] },
  { id: 'hook', kind: 'mate', name: 'Hook mate', icon: '🪝', theme: 'hook', weapon: 'Rook, knight and pawn work together: the knight guards the rook, the pawn guards the knight.', shield: 'Count the attackers near your king, not just the checks.', real: ['allowed-mate', 'missed-mate'] },
  { id: 'mate2', kind: 'mate', name: 'Mate in two', icon: '♛', theme: 'mate2', weapon: 'A forcing first move, then mate. Checks and captures first.', shield: 'If your king has few squares, every enemy check is dangerous.', real: ['allowed-mate', 'missed-mate'] },
  { id: 'convert', kind: 'middle', name: 'Use your advantage', icon: '🏰', theme: 'convert', weapon: 'You are better: find the quiet move that keeps everything and wins more.', shield: 'When you are ahead, first stop your opponent\'s threats, then go forward.' },
  { id: 'defend', kind: 'middle', name: 'Hold the fort', icon: '🧱', theme: 'defend', weapon: 'Under attack: find the one move that holds.', shield: 'Before you attack, check what your opponent threatens.', real: ['ignored-threat'] },
  { id: 'pawnEnd', kind: 'end', name: 'Pawn endgames', icon: '♙', theme: 'pawnEnd', weapon: 'Kings forward! Count the moves to the queening square.', shield: 'In pawn endings one tempo decides – count before you trade into one.' },
  { id: 'minorEnd', kind: 'end', name: 'Knight and bishop endgames', icon: '♗', theme: 'minorEnd', weapon: 'Use your king and make a passed pawn.', shield: 'A knight is slow against pawns on both wings.' },
  { id: 'rookEnd', kind: 'end', name: 'Rook endgames', icon: '♖', theme: 'rookEnd', weapon: 'Rooks belong behind passed pawns, and active.', shield: 'A passive rook loses – keep it active.' },
  { id: 'queenEnd', kind: 'end', name: 'Queen endgames', icon: '♕', theme: 'queenEnd', weapon: 'Checks and forks win in queen endings.', shield: 'Keep your king safe from endless checks.' },
]

export type Stage = 'show' | 'help' | 'alone' | 'defend' | 'mixed' | 'real'
export const STAGES: { stage: Stage; name: string; about: string }[] = [
  { stage: 'show', name: 'See it', about: 'Watch it once, move by move.' },
  { stage: 'help', name: 'With help', about: 'Four puzzles. Ask for a hint whenever you want.' },
  { stage: 'alone', name: 'Alone', about: 'Five puzzles without hints. One slip is allowed.' },
  { stage: 'defend', name: 'Shield', about: 'Now it is used against you. Show the threat in time.' },
  { stage: 'mixed', name: 'Mixed', about: 'Mixed with what you learned before – nobody tells you what it is. No slips.' },
  { stage: 'real', name: 'Real world', about: 'Five finished chess.com games without this mistake.' },
]

// Which puzzles of the theme each stage uses (always the same, easy to hard)
export const SLICES: Record<Exclude<Stage, 'real'>, [number, number]> = {
  show: [0, 1],
  help: [1, 5],
  alone: [5, 10],
  defend: [10, 14],
  mixed: [14, 18],
}

export const REAL_GAMES = 5

export interface TechProgress {
  done: number // stages finished (0 … 6)
  silverAt?: number // when silver was reached: real games after it count
  gold?: boolean
}
export type Armoury = Record<string, TechProgress>

export type Medal = 'none' | 'bronze' | 'silver' | 'gold'
export function medal(p?: TechProgress): Medal {
  if (!p) return 'none'
  if (p.gold) return 'gold'
  if (p.done >= 4) return 'silver'
  if (p.done >= 2) return 'bronze'
  return 'none'
}

export function isOpen(t: Technique, a: Armoury): boolean {
  const same = TECHNIQUES.filter((x) => x.kind === t.kind)
  const i = same.indexOf(t)
  return i <= 0 || medal(a[same[i - 1].id]) !== 'none'
}

// Was the round good enough to count? Help and showing always count; alone and shield allow one
// slip; the mixed round needs every puzzle first try without a hint.
export function passed(stage: Stage, mistakes: number, hints: number): boolean {
  if (stage === 'show' || stage === 'help') return true
  if (stage === 'mixed') return mistakes === 0 && hints === 0
  return mistakes <= 1 && hints === 0
}

// Finishing a stage: only the next stage moves you on (repeating an old one changes nothing)
export function finishStage(a: Armoury, id: string, stage: Stage, now = Date.now()): Armoury {
  const p = a[id] ?? { done: 0 }
  const i = STAGES.findIndex((s) => s.stage === stage)
  if (i !== p.done) return a
  const next: TechProgress = { ...p, done: i + 1 }
  if (next.done === 4) next.silverAt = now
  if (stage === 'real') next.gold = true
  return { ...a, [id]: next }
}

// The real world: finished, analysed chess.com games after silver. Gold when there are
// REAL_GAMES of them in a row (newest) without this kind of mistake (or, for techniques without
// a matching kind of mistake, without any big mistake).
export function realCheck(t: Technique, p: TechProgress | undefined, records: GameRecord[], puzzles: Puzzle[]): { games: number; clean: number; ok: boolean } {
  if (!p?.silverAt) return { games: 0, clean: 0, ok: false }
  const uuid = (k: string) => (k.includes(':') ? k.slice(k.indexOf(':') + 1) : k)
  const after = records.filter((g) => g.endTime * 1000 >= p.silverAt!).sort((a, b) => b.endTime - a.endTime)
  const bad = new Set(puzzles.filter((x) => !t.real || (x.category && t.real.includes(x.category))).map((x) => x.gameUuid))
  const clean = after.filter((g) => !bad.has(uuid(g.uuid)))
  // the newest games count: a run of REAL_GAMES clean games in a row
  let run = 0
  for (const g of after) {
    if (bad.has(uuid(g.uuid))) break
    run++
  }
  return { games: after.length, clean: clean.length, ok: run >= REAL_GAMES }
}

const KEY = 'chess-trainer-armoury'
export function loadArmoury(): Armoury {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Armoury
  } catch {
    return {}
  }
}
export function saveArmoury(a: Armoury) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a))
  } catch {
    // not saved: still works for this visit
  }
}
