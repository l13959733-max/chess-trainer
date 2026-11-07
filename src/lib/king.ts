// King of Chess: Prince Liam and Hoppy follow the game through 1,500 years of history.
// Every station is open except Chennai, the finale, which opens when all other bosses are beaten.
// Facts the masters tell are checked against sources before they go in (see CLAUDE.md).
import type { Line } from './pgn'

export interface Master {
  img?: string // painted portrait in public/king
  name: string
  from: string
  skin: string
  hair: string
  coat: string
  beard?: boolean
  mustache?: boolean
  hat?: boolean
  talk: { who: 'master' | 'liam' | 'hoppy'; text: string }[]
}

// A position where you play one move on the board (from your lines, or a tactic)
export interface BoardRound {
  fen: string
  taunt: string
  from: string
  to: string
  san: string
  why: string
  fromComment?: boolean
  threat?: boolean // you play the opponent: show what he threatens
  guard?: boolean // checked, safe play: answered with the "Knack"
}

export interface QuizQuestion {
  guard?: boolean // a safety question: answered with the "Knack"
  fen?: string // a position to look at
  move?: [string, string] // the move the question is about, drawn as an arrow
  q: string
  icon?: string
  options: string[]
  answer: string
  why: string
}

export type GameId = 'army' | 'riddle' | 'grain' | 'fork' | 'squares' | 'lewis' | 'queen' | 'turk' | 'cross' | 'krk' | 'shuffle' | 'guard' | 'safe' | 'react' | 'traps' | 'forkhunt' | 'forkthreat' | 'mate1' | 'mate2'

export interface Station {
  id: string
  name: string
  year: string
  // On the illustrated world map (1800 × 764)
  x: number
  y: number
  sea?: boolean // reached by ship
  finale?: boolean // opens when every other boss is beaten
  medallion?: boolean // not drawn on the map picture: shown as a round painted badge
  color: string
  intro: string
  skills: string[]
  master: Master
  scene: string // painted picture of the city in public/king
  // the steps of the station; extras (history, fun) are optional and never block the way
  games: { id: GameId; title: string; extra?: boolean }[]
  lines?: { opening: string | string[]; side: 'w' | 'b'; title?: string } // your real lines learned here
  fact?: string // a checked fun fact, the treat after the boss
  boss: {
    name: string
    face: string
    img: string
    kind: 'army' | 'riddle' | 'board' | 'lines' | 'quiz' | 'cross' | 'krk' | 'grand' | 'mixed' | 'puzzles'
    puzzles?: string[] // Lichess puzzle themes for a puzzle boss
    taunt: string
    win: string
    rounds?: BoardRound[]
    quiz?: QuizQuestion[]
  }
}

const BROWN = { skin: '#c68e5f', hair: '#2b2140' }

// ---------- tactics (every position is checked in king.test.ts) ----------

export const FORKS: BoardRound[] = [
  { fen: '3q3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1', taunt: 'Try to catch my caravan!', from: 'e5', to: 'f7', san: 'Nf7+', why: 'Nf7+ checks the king and hits the queen at the same time – a royal fork.' },
  { fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', taunt: 'My rook guards the treasure!', from: 'd5', to: 'c7', san: 'Nc7+', why: 'Nc7+ is check – and the rook on a8 is attacked too. After the king moves, the rook is yours.' },
  { fen: '4k3/1q6/8/8/2N5/8/8/4K3 w - - 0 1', taunt: 'You will never reach my queen!', from: 'c4', to: 'd6', san: 'Nd6+', why: 'Nd6+ checks the king and attacks the queen on b7.' },
]

export const MATES: BoardRound[] = [
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', taunt: 'A position from my book. White to move – and win at once.', from: 'h5', to: 'f7', san: 'Qxf7#', why: 'Qxf7 is checkmate: the bishop on c4 protects the queen, and the king has nowhere to go.' },
  { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', taunt: 'My king hides behind his pawns.', from: 'd1', to: 'd8', san: 'Rd8#', why: 'Rd8# – the king is trapped behind its own pawns. This is the back-rank mate.' },
  { fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', taunt: 'My king is surrounded by friends. Safe!', from: 'h6', to: 'f7', san: 'Nf7#', why: 'Nf7# – the king is smothered by its own pieces. Only a horse can do that.' },
]

export const ROOK_MATES: BoardRound[] = [
  { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', taunt: 'GRAAAH! *bites shield*', from: 'a1', to: 'a8', san: 'Ra8#', why: 'Ra8# – the rook rides the open file to the back rank.' },
  { fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1', taunt: 'One rook cannot catch me!', from: 'b1', to: 'b8', san: 'Rb8#', why: 'Rb8# – one rook guards the 7th rank, the other gives mate. The ladder!' },
  { fen: 'k7/2R5/1K6/8/8/8/8/8 w - - 0 1', taunt: 'I still have a corner left!', from: 'c7', to: 'c8', san: 'Rc8#', why: 'Rc8# – your king guards a7 and b7, the rook takes the back rank.' },
]

export const QUEEN_TACTICS: BoardRound[] = [
  { fen: 'r3k3/8/8/8/8/8/8/3QK3 w - - 0 1', taunt: 'Now I can go anywhere – and so can you?', from: 'd1', to: 'a4', san: 'Qa4+', why: 'Qa4+ checks along the diagonal and attacks the rook on a8 – a queen fork.' },
  { fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', taunt: 'My pawns protect me!', from: 'd1', to: 'd8', san: 'Qd8#', why: 'Qd8# – the queen crosses the whole board in one move. Before 1475 that was impossible!' },
  { fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', taunt: 'From the far corner you cannot reach me!', from: 'h1', to: 'h8', san: 'Qh8#', why: 'Qh8# – the queen sweeps along the back rank, your king covers the escape squares.' },
]

// Lord Fog plays Black and picks from the London lines; you answer with the move from the line
export const LORD_FOG: BoardRound[] = [
  { fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', taunt: '1...d5 – the fog rolls in.', from: 'c1', to: 'f4', san: 'Bf4', why: 'Bishop out first: 2.Bf4, before e3 locks it in.' },
  { fen: 'rnbqkbnr/pp2pppp/8/2pp4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 0 3', taunt: '2...c5 – I hit your center!', from: 'e2', to: 'e3', san: 'e3', why: '3.e3 – open the way for your other bishop. Next comes c3.' },
  { fen: 'r1b1kbnr/pp2pppp/1qn5/2pp4/3P1B2/2P1P3/PP3PPP/RN1QKBNR w KQkq - 1 5', taunt: '4...Qb6 – your b2 pawn is mine!', from: 'd1', to: 'b3', san: 'Qb3', why: '5.Qb3 – offer a queen trade. Now b2 is protected.' },
  { fen: 'rn1qkb1r/ppp1pppp/5n2/3p1b2/3P1B2/4P3/PPP2PPP/RN1QKBNR w KQkq - 1 4', taunt: '3...Bf5 – I copy your bishop!', from: 'c2', to: 'c4', san: 'c4', why: '4.c4 – attack d5. Without its light bishop, b7 gets weak.' },
  // The trick from the comment of the 2...c5 line: "If Black plays Bf5 now, Qxf5 wins the bishop!"
  { fen: 'r3kb1r/pp2pppp/1qn2n2/3p1b2/2pP1B2/2P1P3/PPQN1PPP/R3KBNR w KQkq - 3 8', taunt: '7...Bf5 – your queen must run!', from: 'c2', to: 'f5', san: 'Qxf5', why: 'Nothing protects f5: 8.Qxf5 wins the bishop.', fromComment: true },
]

// Paris: which road (opening) against which answer – positions from your White repertoire
export interface Crossroad {
  fen: string
  q: string
  options: { san: string; note: string; ok?: boolean }[]
  why: string
}
export const CROSSROADS: Crossroad[] = [
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', q: 'After 1.e4 e5 2.Nf3, Black plays 2...Nc6. Which road?', options: [{ san: '3.Bc4', note: 'to Rome – Italian Game', ok: true }, { san: '3.Bb5', note: 'to Valencia – Ruy Lopez', ok: true }, { san: '3.Nc3', note: 'another knight out?' }], why: 'Rome (3.Bc4) or the Ruy Lopez (3.Bb5) – both are in your book.' },
  { fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2', q: 'Black answers 1.d4 with 1...Nf6. Which road?', options: [{ san: '2.Bg5', note: 'to Rio – Trompowsky', ok: true }, { san: '2.c4', note: 'the big center?' }, { san: '2.Nf3', note: 'calm development?' }], why: 'Against 1...Nf6 the bishop jumps out: 2.Bg5, the Trompowsky.' },
  { fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', q: 'Black answers 1.d4 with 1...d5. Which road?', options: [{ san: '2.Bf4', note: 'to London', ok: true }, { san: '2.c4', note: "to the Queen's Palace", ok: true }, { san: '2.Bg5', note: 'to the Winter Forest – Levitsky', ok: true }], why: 'All three roads work against 1...d5. Pick the one you like best!' },
  { fen: 'rnbqkbnr/pppp1ppp/4p3/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', q: 'Black answers 1.d4 with 1...e6. Which road?', options: [{ san: '2.Bg5', note: 'to Rio?' }, { san: '2.e4', note: 'take the whole center – the French', ok: true }, { san: '2.Bf4', note: 'to London?' }], why: '2.e4 takes the whole center – you are in your 1.e4 lines against the French.' },
]

// ---------- the guard: before every move, check what is attacked and what is guarded ----------

// Take what has no guard (every position is checked in king.test.ts)
export const GUARD: BoardRound[] = [
  { fen: 'k7/8/8/3n4/8/8/8/3RK3 w - - 0 1', taunt: '', from: 'd1', to: 'd5', san: 'Rxd5', why: 'The knight on d5 has no guard – take it for free. Always ask first: what is attacked, what is guarded?' },
  { fen: 'k7/8/8/8/8/3n4/8/3RK3 w - - 0 1', taunt: '', from: 'd1', to: 'd3', san: 'Rxd3', why: 'Check! But the checking knight has no guard. When you are attacked, first look: can I take the attacker?' },
  { fen: 'k7/8/8/8/b7/8/8/3QK3 w - - 0 1', taunt: '', from: 'd1', to: 'a4', san: 'Qxa4+', why: 'Your queen is attacked – but the attacker hangs. Take it instead of running away.' },
  { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', taunt: '', from: 'd1', to: 'd8', san: 'Rd8#', why: 'Rd8# – the king is locked in by its own pawns. Always check your own back rank too!' },
].map((r) => ({ ...r, guard: true }))

// Is this move safe? (the answers are checked in king.test.ts)
export const SAFE: QuizQuestion[] = [
  { fen: 'k7/8/2p5/3p4/8/8/8/3QK3 w - - 0 1', move: ['d1', 'd5'], q: 'Is Qxd5 safe?', icon: '🛡', options: ['Yes', 'No'], answer: 'No', why: 'No! The pawn on c6 guards d5. After Qxd5 cxd5 your queen is gone.' },
  { fen: 'k7/8/8/3p4/8/8/8/3QK3 w - - 0 1', move: ['d1', 'd5'], q: 'Is Qxd5 safe now?', icon: '🛡', options: ['Yes', 'No'], answer: 'Yes', why: 'Yes – nothing guards d5 any more. A free pawn.' },
  { fen: '4k3/8/3p4/8/8/5N2/8/4K3 w - - 0 1', move: ['f3', 'e5'], q: 'Is Ne5 safe?', icon: '🛡', options: ['Yes', 'No'], answer: 'No', why: 'No! The pawn on d6 takes on e5. Before you move, check which squares the enemy pawns attack.' },
].map((q): QuizQuestion => ({ ...q, move: q.move as [string, string], guard: true }))

export const GUARD_BOSS: BoardRound[] = [
  { fen: 'k7/8/8/8/5b2/8/8/5RK1 w - - 0 1', taunt: 'Only those who guard their army may pass!', from: 'f1', to: 'f4', san: 'Rxf4', why: 'The bishop on f4 has no guard. Free material!' },
  { fen: 'k7/8/8/8/8/5n2/8/3QK3 w - - 0 1', taunt: 'Check! What now?', from: 'd1', to: 'f3', san: 'Qxf3+', why: 'Take the checking knight – nothing protects it.' },
  { fen: 'r3k3/8/8/8/8/8/8/Q3K3 w - - 0 1', taunt: 'My rook is far away from you.', from: 'a1', to: 'a8', san: 'Qxa8+', why: 'The rook on a8 has no guard – the open file brings your queen right there.' },
  { fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', taunt: 'My pawns protect my king!', from: 'd1', to: 'd8', san: 'Qd8#', why: 'Qd8# – the back rank again. The king has no air.' },
].map((r) => ({ ...r, guard: true }))

// ---------- Rome: how do you react after 1.e4 e5? ----------

// Which move does your book play? (checked against your White lines in king.test.ts)
export const ROME_REACT: Crossroad[] = [
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', q: 'Black answers 2...Nc6. What do you play?', options: [{ san: '3.Bc4', note: 'the Italian Game', ok: true }, { san: '3.Bb5', note: 'the Ruy Lopez – your road in Valencia', ok: true }, { san: '3.Nc3', note: 'another knight' }], why: '3.Bc4 aims at f7, the weakest point in Black’s camp. 3.Bb5 is your other road.' },
  { fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', q: 'Black plays 3...Bc5, the Giuoco Piano. Your move?', options: [{ san: '4.c3', note: 'prepare d4', ok: true }, { san: '4.b4', note: 'the Evans Gambit', ok: true }, { san: '4.Nc3', note: 'quiet development' }], why: '4.c3 prepares d4 for a big center. 4.b4 gives a pawn for fast development – both are in your book.' },
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', q: 'Black plays 3...Nf6, the Two Knights. Your move?', options: [{ san: '4.Ng5', note: 'attack f7 at once', ok: true }, { san: '4.d3', note: 'the calm way', ok: true }, { san: '4.Nc3', note: 'one more knight' }], why: '4.Ng5 hits f7 with knight and bishop. 4.d3 protects e4 and keeps everything safe.' },
  { fen: 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', q: 'Black plays 3...Nd4. Careful! Your move?', options: [{ san: '4.Nxd4', note: 'trade the knight', ok: true }, { san: '4.Nxe5', note: 'grab the pawn' }, { san: '4.c3', note: 'chase the knight' }], why: '4.Nxd4 is simple and good. 4.Nxe5? walks into a trap: 4...Qg5 hits your knight and g2.' },
  { fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', q: 'Black plays 2...Nf6, the Petrov. Your move?', options: [{ san: '3.Nxe5', note: 'take the pawn first', ok: true }, { san: '3.Bc4', note: 'the Italian bishop' }, { san: '3.Nc3', note: 'protect e4' }], why: '3.Nxe5 – take the pawn first. Then watch out for the copycat trap.' },
  { fen: 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', q: 'Black plays 2...d6, the Philidor. Your move?', options: [{ san: '3.d4', note: 'hit the center', ok: true }, { san: '3.Bc4', note: 'the bishop to c4 – and maybe Légal’s trap', ok: true }, { san: '3.h3', note: 'a waiting move' }], why: 'The Philidor is solid but passive. 3.d4 hits the center right away.' },
  { fen: 'r1bqk1nr/ppppbppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', q: 'Black plays the shy 3...Be7. Your move?', options: [{ san: '4.d4', note: 'take the center', ok: true }, { san: '4.Ng5', note: 'jump at f7' }, { san: '4.a3', note: 'a waiting move' }], why: 'The bishop stays at home – use the time and take the center with 4.d4.' },
  { fen: 'r1bqkbnr/pppp1pp1/2n4p/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', q: 'Black plays 3...h6. Your move?', options: [{ san: '4.c3', note: 'prepare d4', ok: true }, { san: '4.Ng5', note: 'jump at f7' }, { san: '4.d4', note: 'open the center now' }], why: '3...h6 stops Ng5 (the pawn takes on g5) but does nothing for development. 4.c3 prepares d4.' },
]

// Traps from your lines: find the move from the line (checked in king.test.ts)
export const ROME_TRAPS: { line: string; san: string; taunt: string }[] = [
  { line: 'Italian: Blackburne Shilling Trap 3...Nd4', san: 'Nxd4', taunt: '3...Nd4 – grab my pawn on e5, go on!' },
  { line: 'Italian: Blackburne Shilling Trap 3...Nd4', san: 'Bxf7+', taunt: '5...Bc5 – my bishop is safe, isn’t it?' },
  { line: 'Trap: Petrov 3...Nxe4?', san: 'Qe2', taunt: '3...Nxe4 – I copy you!' },
  { line: 'Trap: Petrov 3...Nxe4?', san: 'Nc6+', taunt: '4...Nf6 – my knight runs home.' },
  { line: "Trap: Légal's Mate", san: 'Nxe5', taunt: '5...Bh5 – your knight is pinned!' },
  { line: 'Two Knights: Fried Liver Attack', san: 'Nxf7', taunt: '5...Nxd5 – I take back.' },
  { line: 'Two Knights: Avoiding the Traxler', san: 'Bxf7+', taunt: '4...Bc5 – take f7 with the knight, if you dare!' },
]

// What does your opponent threaten? You play his move (checked in king.test.ts)
export const ROME_THREATS: BoardRound[] = [
  { fen: 'r1bqkbnr/pppp1ppp/8/4N3/2BnP3/8/PPPP1PPP/RNBQK2R b KQkq - 0 4', taunt: 'You grabbed the pawn with 4.Nxe5?', from: 'd8', to: 'g5', san: 'Qg5', why: '4...Qg5! attacks your knight on e5 and the pawn on g2 at once. That is why 4.Nxd4 is the move.', threat: true },
  { fen: 'r1bqkb1r/ppp2ppp/8/n2Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 1 5', taunt: '5...Na5 – what does my knight want?', from: 'a5', to: 'c4', san: 'Nxc4', why: 'The knight attacks your bishop on c4. That is why 6.Bb5+ comes next in your line.', threat: true },
]

// ---------- the stations ----------

export const STATIONS: Station[] = [
  {
    id: 'kannauj', name: 'Kannauj', year: '600s', x: 1470, y: 468, color: '#e8590c',
    intro: 'Where it all began: an army small enough to fit on a table.',
    skills: ['Foot soldiers', 'Horses', 'Chariots', 'Elephants', 'The counselor'],
    scene: 'kannauj.jpg',
    master: {
      img: 'bana.jpg', name: 'Bana, the court poet', from: "King Harsha's court, 600s", ...BROWN, coat: '#e8590c', beard: true,
      talk: [
        { who: 'master', text: "Welcome, Prince Liam. I write the story of King Harsha's court here in Kannauj." },
        { who: 'liam', text: 'What is that board with all the little soldiers?' },
        { who: 'master', text: 'Our whole army: foot soldiers, horses, chariots and elephants. The four members of an army – chaturanga!' },
        { who: 'master', text: 'In my book I joke that our kingdom is so peaceful, armies are only drawn up on chessboards.' },
        { who: 'hoppy', text: 'And I am one of the horses? Neigh!' },
        { who: 'master', text: 'A good general asks before every move: what does the enemy attack – and what is guarded?' },
      ],
    },
    games: [
      { id: 'guard', title: 'The guard: take what is free' },
      { id: 'safe', title: 'Is it safe?' },
      { id: 'army', title: 'Meet your army', extra: true },
    ],
    fact: 'Chaturanga means “four parts” in Sanskrit – the four parts of an Indian army: foot soldiers, horses, chariots and elephants.',
    boss: { name: 'The Captain of the Guard', face: '🛡', img: 'boss-captain.jpg', kind: 'board', rounds: GUARD_BOSS, taunt: 'Only those who guard their army may pass!', win: 'Your army is safe with you. Now on to Samarkand – Hoppy’s favourite trick is waiting!' },
  },
  {
    id: 'persia', name: 'Persia', year: '500s', x: 1320, y: 445, color: '#0b7285',
    intro: 'A board arrives from India – with no rules. Can you work them out?',
    skills: ['Read the rules', 'Shāh māt – checkmate'],
    scene: 'persia.jpg',
    master: {
      img: 'buzurg.jpg', name: 'Buzurgmihr', from: 'Chief minister of King Khosrau', skin: '#d9a77c', hair: '#5a3b22', coat: '#0b7285', beard: true,
      talk: [
        { who: 'master', text: 'An envoy from India brought this board to King Khosrau. No rules – only a riddle.' },
        { who: 'master', text: '"Work out the game," the letter says, "or Persia pays India tribute."' },
        { who: 'liam', text: 'And did you work it out?' },
        { who: 'master', text: 'In one day and one night – at least that is how the Book of Kings tells it. Now it is your turn: watch the elephant and find its rule!' },
      ],
    },
    games: [{ id: 'riddle', title: 'The riddle of the elephant', extra: true }],
    boss: { name: 'The Indian envoy', face: '🐘', img: 'boss-envoy.jpg', kind: 'riddle', taunt: 'Work out the game – or Persia pays!', win: 'Like Buzurgmihr, you worked out the rule just by watching. The envoy bows – Persia keeps its gold.' },
  },
  {
    id: 'samarkand', name: 'Samarkand', year: '700s', x: 1365, y: 325, color: '#1971c2',
    intro: 'Caravans carry the game along the Silk Road – east and west.',
    skills: ['Forks with the horse', 'Doubling'],
    scene: 'samarkand.jpg',
    master: {
      img: 'farrukh.jpg', name: 'Farrukh, a merchant', from: 'Silk Road market, 700s', ...BROWN, coat: '#1971c2', beard: true,
      talk: [
        { who: 'master', text: 'Welcome to Samarkand, Prince Liam! Caravans from India, Persia and China all meet in this market.' },
        { who: 'liam', text: 'What are these tiny ivory figures?' },
        { who: 'master', text: 'Seven chess pieces: a king, a counselor, a chariot, an elephant, two horsemen and a foot soldier. Not abstract shapes – a little army.' },
        { who: 'hoppy', text: 'In 1977 archaeologists found a set just like this in the ruins of Afrasiab, right here – some of the oldest chess pieces known!' },
        { who: 'master', text: 'Then learn the horse’s best trick, little horse: the fork. One jump, two targets.' },
      ],
    },
    games: [
      { id: 'fork', title: "Hoppy's fork" },
      { id: 'forkhunt', title: 'Fork hunt' },
      { id: 'forkthreat', title: "Don't get forked" },
      { id: 'grain', title: 'The legend of the grain', extra: true },
    ],
    boss: { name: 'The Caravan Thief', face: '🗡', img: 'boss-thief.jpg', kind: 'puzzles', puzzles: ['fork', 'hanging'], taunt: 'Try to catch my caravan!', win: 'Forks everywhere – the treasures are back. On to Rome: your first opening is waiting!' },
  },
  {
    id: 'baghdad', name: 'Baghdad', year: '762–946', x: 1210, y: 452, color: '#5f3dc4',
    intro: 'The round city. Here chess gets its first famous masters – and its first books of puzzles.',
    skills: ['Know every square', 'Checkmate puzzles'],
    scene: 'baghdad.jpg',
    master: {
      img: 'suli.jpg', name: 'al-Suli', from: 'The best player of his age', ...BROWN, coat: '#5f3dc4', beard: true,
      talk: [
        { who: 'master', text: 'Welcome to Baghdad, the round city on the Tigris. The best players are famous here – even the caliphs watch our games.' },
        { who: 'master', text: 'Al-Adli wrote one of the first books about chess, full of puzzles: a position, and one question – how do you win from here?' },
        { who: 'master', text: 'I left a puzzle with only four pieces. People say nobody solved it for a thousand years.' },
        { who: 'liam', text: 'And how can anyone play without looking at the board?' },
        { who: 'master', text: 'You must know every square by its name. Try it!' },
      ],
    },
    games: [
      { id: 'mate1', title: 'Mate in one' },
      { id: 'mate2', title: 'Mate in two' },
      { id: 'squares', title: 'Blindfold: find the square', extra: true },
    ],
    boss: { name: 'The Grandee', face: '📜', img: 'boss-grandee.jpg', kind: 'puzzles', puzzles: ['backrank', 'smothered', 'mate2'], taunt: 'Positions from our book. Solve them all!', win: 'Mate after mate. Baghdad calls you a grandee!' },
  },
  {
    id: 'north', name: 'The North', year: '1000–1200', x: 935, y: 118, sea: true, color: '#495057',
    intro: 'Chess reaches the far north. Kings on thrones, knights on sturdy horses – and rooks that bite their shields.',
    skills: ['Rooks', 'The back rank'],
    scene: 'north.jpg',
    master: {
      img: 'astrid.jpg', name: 'Astrid, a carver', from: 'Workshop in Trondheim, 1100s', skin: '#f2c9a0', hair: '#d9b45a', coat: '#495057',
      talk: [
        { who: 'master', text: 'Hej, Prince Liam! I carve chessmen from walrus ivory.' },
        { who: 'master', text: 'Look at the rooks: warriors biting their shields. We call them berserkers.' },
        { who: 'master', text: 'Where you have an elephant, we have a bishop. Some say the two points of the old elephant piece looked like a bishop’s hat to us.' },
        { who: 'hoppy', text: 'Fun fact from the future: in 1831 a whole hoard of pieces like these was found on the Isle of Lewis in Scotland!' },
        { who: 'master', text: 'Then show me what my rooks can do. Beware of the berserker!' },
      ],
    },
    games: [{ id: 'lewis', title: 'The Lewis chessmen', extra: true }],
    boss: { name: 'The Berserker', face: '🪓', img: 'boss-berserker.jpg', kind: 'board', rounds: ROOK_MATES, taunt: 'GRAAAH! *bites shield*', win: 'The berserker drops his shield – and laughs. Your rooks rule the North.' },
  },
  {
    id: 'valencia', name: 'Valencia', year: '1475–1561', x: 845, y: 372, color: '#c92a2a',
    intro: 'For about 500 years the queen moved one square at a time. Here she gets the whole board.',
    skills: ['The new queen', 'Ruy Lopez'],
    scene: 'valencia.jpg',
    master: {
      img: 'ruylopez.jpg', name: 'Ruy López', from: 'Spanish priest and chess author', skin: '#e0b48a', hair: '#2b2140', coat: '#2b2140',
      talk: [
        { who: 'master', text: '¡Bienvenido! Around 1475, poets here in Valencia wrote a poem about a game of chess – with a brand-new queen.' },
        { who: 'master', text: 'Suddenly she could move as far as she liked, in any direction. People called it the “mad queen’s chess”.' },
        { who: 'master', text: 'In 1561 I printed my own chess book. My name stuck to an opening: 1.e4 e5 2.Nf3 Nc6 3.Bb5.' },
        { who: 'hoppy', text: 'The Ruy Lopez! Those lines are in your book, Liam.' },
      ],
    },
    games: [{ id: 'queen', title: 'The queen awakens', extra: true }],
    lines: { opening: 'Ruy Lopez', side: 'w' },
    boss: { name: 'The Mad Queen', face: '👑', img: 'boss-madqueen.jpg', kind: 'board', rounds: QUEEN_TACTICS, taunt: 'Now I can go anywhere – and so can you?', win: 'The Mad Queen bows to you. You command the strongest piece on the board.' },
  },
  {
    id: 'rome', name: 'Rome', year: 'around 1600', x: 972, y: 352, color: '#e8590c',
    intro: 'A travelling master writes down his games by hand – and shows how to attack f7.',
    skills: ['Bishop to c4', 'c3 and d4', 'Attack f7'],
    scene: 'rome.jpg',
    master: {
      img: 'greco.jpg', name: 'Gioachino Greco', from: 'Travelling chess master', skin: '#e0b48a', hair: '#5a3b22', coat: '#e8590c', beard: true,
      talk: [
        { who: 'master', text: 'Buongiorno! I am Gioachino Greco. I write chess games by hand for rich patrons – and I travel to play.' },
        { who: 'master', text: 'Many call me the first professional chess player.' },
        { who: 'master', text: 'My favourite plan: bishop to c4, aim at f7 – the weakest point next to the king. The Italian Game!' },
        { who: 'master', text: 'After 1.e4 e5 2.Nf3 your opponent can answer in many ways. For each one you need a plan – and you must know the traps.' },
        { who: 'liam', text: 'Count Giuoco is waiting at the end of the street…' },
      ],
    },
    games: [
      { id: 'react', title: 'How do you react?' },
      { id: 'traps', title: 'Traps' },
    ],
    lines: { opening: ['Italian Game', 'Two Knights Defense', 'Petrov Defense', 'Philidor Defense'], side: 'w' },
    fact: 'One of the oldest openings: Italian masters like Polerio and Greco studied it around 1600. “Giuoco Piano” is Italian for “quiet game”.',
    boss: { name: 'Count Giuoco', face: '🎩', img: 'boss-giuoco.jpg', kind: 'mixed', taunt: 'Show me your Italian, little prince!', win: 'Count Giuoco takes off his feathered hat. You know how to react after 1.e4 e5.' },
  },
  {
    id: 'palace', name: "Queen's Palace", year: 'around 1490', x: 955, y: 212, medallion: true, color: '#7048e8',
    intro: 'In an old manuscript you find one of the oldest openings: the Queen’s Gambit.',
    skills: ['Offer the c-pawn', 'Win it back'],
    scene: 'palace.jpg',
    master: {
      img: 'scholar.jpg', name: 'The librarian', from: 'Keeper of old manuscripts', skin: '#f2c9a0', hair: '#8a6a4a', coat: '#7048e8',
      talk: [
        { who: 'master', text: 'Quiet, please – this is a library. Look at this manuscript, written in Göttingen around 1490.' },
        { who: 'master', text: 'It is one of the oldest places where this opening appears: 1.d4 d5 2.c4 – the Queen’s Gambit.' },
        { who: 'liam', text: 'A gambit? I give away a pawn?' },
        { who: 'master', text: 'You offer it. If Black takes, you win it back with e3 and Bxc4 – and you have the center.' },
      ],
    },
    games: [],
    lines: { opening: "Queen's Gambit", side: 'w' },
    boss: { name: "The Queen's Guard", face: '💂', img: 'boss-guard.jpg', kind: 'lines', taunt: 'None shall pass – unless they know the gambit!', win: 'The guard steps aside. The Queen’s Palace is yours.' },
  },
  {
    id: 'vienna', name: 'Vienna', year: '1770', x: 1005, y: 272, color: '#a61e4d',
    intro: 'A machine that plays chess and wins? Who – or what – is inside the box?',
    skills: ['Vienna Game', 'Look behind the trick'],
    scene: 'vienna.jpg',
    master: {
      img: 'kempelen.jpg', name: 'The court inventor', from: 'Builder of the Turk', skin: '#f2c9a0', hair: '#e9ecef', coat: '#a61e4d',
      talk: [
        { who: 'master', text: 'Willkommen in Wien! In 1770 Wolfgang von Kempelen showed Empress Maria Theresa a chess machine: the Turk.' },
        { who: 'liam', text: 'A machine that plays chess? In 1770?' },
        { who: 'master', text: 'Shhh… find out yourself what is inside the box.' },
        { who: 'hoppy', text: 'I can smell a person in there…' },
      ],
    },
    games: [{ id: 'turk', title: 'Who is inside the box?', extra: true }],
    lines: { opening: 'Vienna Game', side: 'w' },
    boss: { name: 'The Turk', face: '🤖', img: 'boss-turk.jpg', kind: 'lines', taunt: 'Click… whirr… your move, young prince.', win: 'The Turk’s arm stops. Whoever is inside – you were better.' },
  },
  {
    id: 'paris', name: 'Paris', year: '1740–1858', x: 900, y: 298, color: '#1864ab',
    intro: 'The famous chess café: here you learn which road to take against every answer.',
    skills: ['Which opening when?', 'Légal’s trap'],
    scene: 'paris.jpg',
    master: {
      img: 'philidor.jpg', name: 'François-André Philidor', from: 'Composer and chess master', skin: '#f2c9a0', hair: '#e9ecef', coat: '#1864ab',
      talk: [
        { who: 'master', text: 'Bonjour! Welcome to the Café de la Régence – the best players in Paris meet here.' },
        { who: 'master', text: 'I write operas for a living, but chess is my passion. My teacher here was Légal – his trap is in your book.' },
        { who: 'hoppy', text: 'And in 1858 a young American, Paul Morphy, will win games here that amaze everyone.' },
        { who: 'master', text: 'Your rival Rocco is here too. He plays what your real opponents play!' },
      ],
    },
    games: [{ id: 'cross', title: 'Which road?' }],
    lines: { opening: 'Philidor Defense', side: 'w' },
    boss: { name: 'Rocco the Rook, your rival', face: '♜', img: 'boss-rocco.jpg', kind: 'cross', taunt: 'Against your 1.e4, your opponents answered 1...e5 in 57% of games. Ready?', win: 'Rocco is speechless. You always know which road to take.' },
  },
  {
    id: 'london', name: 'London', year: '1849–1922', x: 878, y: 228, sea: true, color: '#364fc7',
    intro: 'The Staunton pieces, the first big tournament – and a system named after this city.',
    skills: ['Bishop out before e3', 'Pawn chain c3-d4-e3', 'Keep the bishop: Bg3'],
    scene: 'london.jpg',
    master: {
      img: 'mason.jpg', name: 'James Mason', from: 'Master of the London System', skin: '#f2c9a0', hair: '#8a6a4a', coat: '#364fc7', mustache: true, hat: true,
      talk: [
        { who: 'master', text: 'Good day, Prince Liam – and good day, Hoppy. Welcome to London.' },
        { who: 'liam', text: 'Why is this system called London?' },
        { who: 'master', text: 'At the big London tournament of 1922 it was played seven times. That gave it the name.' },
        { who: 'master', text: 'The secret: bring your bishop to f4 before you play e3. Then build a strong pawn chain. And beware of Lord Fog!' },
      ],
    },
    games: [],
    lines: { opening: 'London System', side: 'w' },
    boss: { name: 'Lord Fog of London', face: '🎩', img: 'boss-fog.jpg', kind: 'board', rounds: LORD_FOG, taunt: '1...d5 – the fog rolls in.', win: 'The fog lifts over London. You get the London badge.' },
  },
  {
    id: 'forest', name: 'Winter Forest', year: 'around 1910', x: 1110, y: 175, medallion: true, color: '#1c7ed6',
    intro: 'Deep in the snow lives a master who jumps out with his bishop – just like in Rio.',
    skills: ['Levitsky 2.Bg5', 'Against …Qb6'],
    scene: 'forest.jpg',
    master: {
      img: 'levitsky.jpg', name: 'Stepan Levitsky', from: 'Russian chess master', skin: '#f2c9a0', hair: '#5a3b22', coat: '#1c7ed6', beard: true,
      talk: [
        { who: 'master', text: 'Come in, come in – it is cold out there! I am Stepan Levitsky.' },
        { who: 'master', text: 'Against 1.d4 d5 I like to jump out at once: 2.Bg5. The opening carries my name.' },
        { who: 'hoppy', text: 'The same bishop jump as the Trompowsky – one idea for two answers!' },
      ],
    },
    games: [],
    lines: { opening: 'Levitsky Attack', side: 'w' },
    boss: { name: 'The Snow Bishop', face: '❄️', img: 'boss-snowbishop.jpg', kind: 'lines', taunt: 'My diagonals are frozen solid!', win: 'The Snow Bishop melts into a smile. Spring comes to the forest.' },
  },
  {
    id: 'reykjavik', name: 'Reykjavík', year: '1972', x: 745, y: 120, sea: true, color: '#a61e4d',
    intro: 'The match the whole world watched – and a first move nobody expected.',
    skills: ['Black against 1.c4'],
    scene: 'reykjavik.jpg',
    master: {
      img: 'sigrun.jpg', name: 'Sigrún, the arbiter', from: 'Keeper of the clock', skin: '#f2c9a0', hair: '#d9b45a', coat: '#a61e4d',
      talk: [
        { who: 'master', text: 'Velkomin to Reykjavík, 1972! The whole world is watching one match: Fischer against Spassky.' },
        { who: 'master', text: 'In game 6 Fischer surprised everyone with his very first move: 1.c4 instead of 1.e4.' },
        { who: 'master', text: 'When that game ended, Spassky stood up and applauded him.' },
        { who: 'hoppy', text: 'Then let’s learn what to play as Black when someone opens 1.c4!' },
      ],
    },
    games: [],
    lines: { opening: 'Other first moves', side: 'b', title: '1.c4' },
    boss: { name: 'The Ice Challenger', face: '🧊', img: 'boss-challenger.jpg', kind: 'lines', taunt: '1.c4. Surprised?', win: 'The Ice Challenger stands up – and applauds you, like Spassky did.' },
  },
  {
    id: 'newyork', name: 'New York', year: '1886–1997', x: 440, y: 322, sea: true, color: '#343a40',
    intro: 'The first world championship – and the day a computer beat the champion.',
    skills: ['Mate with king and rook'],
    scene: 'newyork.jpg',
    master: {
      img: 'ada.jpg', name: 'Ada, an engineer', from: 'Builds chess machines', skin: '#c68e5f', hair: '#2b2140', coat: '#343a40',
      talk: [
        { who: 'master', text: 'Hi, Liam! In 1886 the first official world championship match started here in New York.' },
        { who: 'master', text: 'In 1912 the Spanish engineer Torres Quevedo built a machine that could mate a lone king with king and rook – every time.' },
        { who: 'master', text: 'And in 1997, here in New York, the computer Deep Blue beat the world champion Garry Kasparov.' },
        { who: 'hoppy', text: 'So the Machine knows how to mate. Do we?' },
      ],
    },
    games: [{ id: 'krk', title: 'King and rook against king' }],
    boss: { name: 'The Machine', face: '🖥', img: 'boss-machine.jpg', kind: 'krk', taunt: 'I will escape. Probability: 99.7%.', win: 'Checkmate. The Machine prints a single word: RESPECT.' },
  },
  {
    id: 'rio', name: 'Rio', year: '1930s', x: 600, y: 692, sea: true, color: '#2b8a3e',
    intro: 'A Brazilian master and his bishop jump: 1.d4 Nf6 2.Bg5!',
    skills: ['Bishop jump: 2.Bg5', 'Kick the knight: f3'],
    scene: 'rio.jpg',
    master: {
      img: 'trompowsky.jpg', name: 'Octávio Trompowsky', from: 'Brazilian champion', skin: '#e0b48a', hair: '#2b2140', coat: '#2b8a3e', mustache: true,
      talk: [
        { who: 'master', text: 'Olá! I was born here in Rio de Janeiro, in 1897.' },
        { who: 'master', text: 'After 1.d4 Nf6 I play 2.Bg5 at once. I played it in the 1930s and 1940s, so the opening got my name.' },
        { who: 'master', text: 'In 1939 I became the chess champion of Brazil.' },
        { who: 'hoppy', text: 'A bishop that jumps out early? Like me, but diagonal!' },
      ],
    },
    games: [],
    lines: { opening: 'Trompowsky', side: 'w' },
    boss: { name: 'The Jungle Jaguar', face: '🐆', img: 'boss-jaguar.jpg', kind: 'lines', taunt: 'Rrrr… show me your bishop jump!', win: 'The jaguar purrs. Rio salutes the bishop jumper!' },
  },
  {
    id: 'orbit', name: 'Orbit', year: '1970 →', x: 1435, y: 245, color: '#2b2140',
    intro: 'Chess leaves the Earth – and in other dimensions even the rules change.',
    skills: ['Chess960'],
    scene: 'orbit.jpg',
    master: {
      img: 'yuri.jpg', name: 'Yuri, a cosmonaut', from: 'Space station crew', skin: '#f2c9a0', hair: '#8a6a4a', coat: '#495057',
      talk: [
        { who: 'master', text: 'Privet! On 9 June 1970 two cosmonauts on Soyuz 9 played chess against mission control on Earth – the first documented game in space.' },
        { who: 'master', text: 'Our board had pegs, not magnets – magnets could disturb the spaceship.' },
        { who: 'master', text: 'And out here the laws change. In 1996 Bobby Fischer presented Chess960: the back row is shuffled, so memorised openings don’t help.' },
        { who: 'hoppy', text: '960 different starting positions? My head is spinning…' },
      ],
    },
    games: [{ id: 'shuffle', title: 'Planet 960' }],
    boss: {
      name: 'The Shuffler', face: '🎲', img: 'boss-shuffler.jpg', kind: 'quiz', taunt: 'Everything is shuffled. Do you still know the rules?', win: 'The Shuffler drops all his pieces – they land in perfect order. Well played!',
      quiz: [
        { q: 'In Chess960, where do the two bishops stand?', icon: '♝', options: ['On squares of opposite colours', 'Always next to each other', 'Always in the corners'], answer: 'On squares of opposite colours', why: 'The bishops always stand on squares of opposite colours – one light, one dark.' },
        { q: 'Where is the king?', icon: '♚', options: ['Somewhere between the two rooks', 'Always on e1', 'In a corner'], answer: 'Somewhere between the two rooks', why: 'The king always stands between the two rooks, so castling still works.' },
        { q: 'How many different starting positions are there?', icon: '🎲', options: ['960', '64', '1,000,000'], answer: '960', why: 'There are exactly 960 – that gave the variant its name.' },
      ],
    },
  },
  {
    id: 'chennai', name: 'Chennai', year: 'today', x: 1515, y: 582, sea: true, finale: true, color: '#5b36c9',
    intro: 'The game comes home to India. One last challenge – then the crown.',
    skills: ['Everything you learned'],
    scene: 'chennai.jpg',
    master: {
      img: 'meera.jpg', name: 'Meera, a chess coach', from: 'Chennai, today', ...BROWN, coat: '#5b36c9',
      talk: [
        { who: 'master', text: 'Welcome home, Prince Liam. The game began in India – and now it has come back.' },
        { who: 'master', text: 'In 1988 Viswanathan Anand became India’s first grandmaster. In 2024 Gukesh from Chennai became world champion at 18.' },
        { who: 'master', text: 'Now show everything you learned on your journey. Win the Grand Tour – and the crown is yours.' },
        { who: 'hoppy', text: 'All the bosses at once? Let’s go, Liam!' },
      ],
    },
    games: [],
    boss: { name: 'The King of Chess', face: '♚', img: 'boss-king.jpg', kind: 'grand', taunt: 'Only a true king may sit on this throne.', win: 'Prince Liam is now the King of Chess!' },
  },
]

// The War Tent on the map (it travels with Liam, but the map shows it near Kannauj)
export const TENT_AT = { x: 1600, y: 485 }

export const stationById = (id: string | undefined) => STATIONS.find((s) => s.id === id)

// Chennai waits until every other boss is beaten
export function isOpen(s: Station, beaten: string[]): boolean {
  return !s.finale || STATIONS.filter((x) => !x.finale).every((x) => beaten.includes(x.id))
}

// Indian names of the pieces (Hindi); the game started with these four parts of an army
export const ARMY = [
  { piece: 'r', icon: '🐘', name: 'Haathi', is: 'elephant = rook' },
  { piece: 'b', icon: '🐪', name: 'Oont', is: 'camel = bishop' },
  { piece: 'n', icon: '🐎', name: 'Ghoda', is: 'horse = knight' },
  { piece: 'k', icon: '🤴', name: 'Raja', is: 'king' },
  { piece: 'q', icon: '🧔', name: 'Mantri', is: 'counselor = queen' },
  { piece: 'p', icon: '🛡', name: 'Pyaada', is: 'foot soldier = pawn' },
] as const

// Persia: in shatranj the elephant jumped exactly two squares diagonally
export const RIDDLES = [
  { at: 'g5', seen: ['c1', 'e3', 'g5'], q: 'The elephant went c1 → e3 → g5. Where can it go next from g5?', options: [{ text: 'e7', note: 'two squares diagonally', ok: true }, { text: 'h6', note: 'one square diagonally' }, { text: 'g7', note: 'two squares straight' }] },
  { at: 'd4', seen: ['d4', 'b6', 'f2'], q: 'From d4 it can jump to b6 and f2. Which square can it NEVER reach from d4?', options: [{ text: 'f6' }, { text: 'b2' }, { text: 'e5', note: 'one step only', ok: true }] },
] as { at: string; seen: string[]; q: string; options: { text: string; note?: string; ok?: boolean }[] }[]

// Samarkand: one grain on the first square, two on the second, doubling to the 64th
export const GRAIN: QuizQuestion[] = [
  { q: 'One grain on square 1, two on square 2, four on square 3 … How many on square 5?', icon: '🌾', options: ['16', '10', '25'], answer: '16', why: '1, 2, 4, 8, 16 – it doubles every square.' },
  { q: 'How many grains lie on square 11?', icon: '🌾', options: ['1,024', '110', '2,048'], answer: '1,024', why: 'Square 11 has 2 × 2 × … ten times = 1,024 grains.' },
  { q: 'And on all 64 squares together?', icon: '🌍', options: ['More than 18 quintillion', 'About a million', 'Exactly 6,400'], answer: 'More than 18 quintillion', why: '18,446,744,073,709,551,615 grains – about a thousand times the wheat the whole world harvests in a year.' },
]

// The North: what is known about the Lewis chessmen
export const LEWIS: QuizQuestion[] = [
  { q: 'What are most of the Lewis chessmen carved from?', icon: '🦭', options: ['Walrus ivory', 'Gold', 'Oak wood'], answer: 'Walrus ivory', why: 'Nearly all of them are walrus ivory, a few are whale teeth.' },
  { q: 'Where were they found in 1831?', icon: '🏝', options: ['On the Isle of Lewis in Scotland', 'In a castle in Rome', 'Under Big Ben'], answer: 'On the Isle of Lewis in Scotland', why: 'They turned up on the Isle of Lewis in the Outer Hebrides, Scotland.' },
  { q: 'What do some of the rooks do?', icon: '🛡', options: ['Bite their shields', 'Play the flute', 'Sleep'], answer: 'Bite their shields', why: 'They are berserkers – warriors biting their shields.' },
]

// Vienna: the secret of the Turk
export const TURK: QuizQuestion[] = [
  { q: 'In which year did the Turk first play at the court in Vienna?', icon: '🏰', options: ['1770', '1497', '1922'], answer: '1770', why: 'Wolfgang von Kempelen showed it to Empress Maria Theresa in 1770.' },
  { q: 'Who really played the moves?', icon: '🕵', options: ['A strong player hidden inside', 'Clockwork gears', 'A trained parrot'], answer: 'A strong player hidden inside', why: 'A human chess player sat hidden inside the cabinet and moved the arm.' },
  { q: 'What happened to the Turk in 1854?', icon: '🔥', options: ['It burned in a fire in Philadelphia', 'It won a world championship', 'It flew to the moon'], answer: 'It burned in a fire in Philadelphia', why: 'On 5 July 1854 a fire in Philadelphia destroyed it.' },
]

// Progress on this phone
const KEY = 'chess-trainer-king'
export interface KingProgress {
  intro: boolean
  here: string
  beaten: string[]
  coins: number
  got: string[] // steps already rewarded, e.g. "rome/react"
  travel?: string // after a boss: Liam rides on to this station when the map opens
  baseline?: Baseline // the chess check: your real games before the training
  quests?: Record<string, number> // real-world quests: when each one started
  reports?: number // reports already shown (one per 20 games after the start)
}

export interface Baseline {
  at: number
  player: string
  games: string[] // chess.com game uuids
  rating: number | null
  mistakes: number // per game
  threats: number // per game: threats of the opponent not seen
}

const FRESH: KingProgress = { intro: false, here: 'kannauj', beaten: [], coins: 0, got: [] }

export function loadKing(): KingProgress {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return { ...FRESH, ...JSON.parse(saved) }
  } catch {
    // ignore
  }
  return { ...FRESH }
}

// Coins for a finished step, only the first time
export function earn(step: string, coins: number): number {
  const p = loadKing()
  if (p.got.includes(step)) return 0
  saveKing({ ...p, coins: p.coins + coins, got: [...p.got, step] })
  return coins
}

// Titles grow with every boss beaten – with a wink: Pawn Star, Rook-ie, Knight Owl
export const TITLES: { bosses: number; name: string }[] = [
  { bosses: 0, name: 'Pawn' },
  { bosses: 1, name: 'Pawn Star' },
  { bosses: 3, name: 'Rook-ie' },
  { bosses: 5, name: 'Knight Owl' },
  { bosses: 8, name: 'Bishop of the Board' },
  { bosses: 12, name: "Queen's Champion" },
]
export function titleOf(beaten: string[]): string {
  if (beaten.includes('chennai')) return 'King of Chess'
  const n = beaten.filter((id) => id !== 'chennai').length
  return [...TITLES].reverse().find((t) => n >= t.bosses)!.name
}

// The main road: first the guard, then your openings in the order you meet them most
export const ROAD = ['kannauj', 'samarkand', 'rome', 'baghdad']
export function nextStation(after: string, beaten: string[]): Station | undefined {
  const order = [...ROAD, ...STATIONS.map((s) => s.id).filter((id) => !ROAD.includes(id))]
  const rest = order.slice(order.indexOf(after) + 1).concat(order.slice(0, order.indexOf(after)))
  return rest.map((id) => stationById(id)!).find((s) => !beaten.includes(s.id) && s.id !== after && isOpen(s, beaten))
}

export function saveKing(p: KingProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // not remembered
  }
}

// ---------- boss rounds from your own lines ----------

export function stationLines(s: Station, lines: Line[]): Line[] {
  if (!s.lines) return []
  const { opening, side, title } = s.lines
  const openings = Array.isArray(opening) ? opening : [opening]
  return lines.filter((l) => l.source !== 'import' && openings.includes(l.opening ?? '') && l.side === side && (!title || l.title.includes(title)))
}

function shuffled<T>(a: T[]): T[] {
  const b = [...a]
  for (let k = b.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1))
    ;[b[k], b[j]] = [b[j], b[k]]
  }
  return b
}

const LINE_TAUNTS = ['Your move – if you know it!', 'Is that in your book?', 'Hmm… what now?', 'Show me your line!', 'Last chance!']

// Rounds from your real lines: positions where it is your move, a few moves into the line.
// Only positions where all these lines play the same move – where your book branches
// (e.g. 3.f4 or 3.Bc4 in the Vienna), both would be right, so the boss doesn't ask there.
export function lineRounds(lines: Line[], count: number): BoardRound[] {
  const place = (fen: string) => fen.split(' ')[0]
  const answers = new Map<string, Set<string>>()
  for (const l of lines)
    for (const m of l.moves) if (m.color === l.side) answers.set(place(m.fenBefore), (answers.get(place(m.fenBefore)) ?? new Set()).add(m.san))
  const pool = lines.flatMap((l) =>
    l.moves.map((m, i) => ({ l, m, i })).filter(({ m, i }) => m.color === l.side && i >= 2 && i <= 16 && answers.get(place(m.fenBefore))!.size === 1),
  )
  const picked: typeof pool = []
  for (const x of shuffled(pool)) {
    if (picked.length >= count) break
    if (picked.some((p) => place(p.m.fenBefore) === place(x.m.fenBefore))) continue
    if (picked.some((p) => p.l === x.l) && new Set(pool.map((p) => p.l)).size >= count) continue
    picked.push(x)
  }
  return picked.map(({ m }, k) => ({
    fen: m.fenBefore,
    taunt: LINE_TAUNTS[k % LINE_TAUNTS.length],
    from: m.from,
    to: m.to,
    san: m.san,
    why: m.comment ?? `In your line you play ${m.san} here.`,
  }))
}
