// King of Chess: Prince Liam and Hoppy follow the game through 1,500 years of history.
// Stage 1 opens Kannauj, Persia and London; the other stations wait under fog.
// Facts the masters tell are checked against sources before they go in (see CLAUDE.md).

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

export interface Station {
  id: string
  name: string
  year: string
  // On the illustrated world map (1800 × 764)
  x: number
  y: number
  open: boolean
  sea?: boolean // reached by ship
  color: string
  intro: string
  skills: string[]
  master?: Master
  scene?: string // painted picture of the city in public/king
  games: { id: 'army' | 'riddle'; title: string }[]
  opening?: string // [Opening] of the real lines learned here
  boss: { name: string; face: string; kind: 'army' | 'riddle' | 'london' }
}

export const STATIONS: Station[] = [
  {
    id: 'kannauj', name: 'Kannauj', year: '600s', x: 1470, y: 468, open: true, color: '#e8590c',
    intro: 'Where it all began: an army small enough to fit on a table.',
    skills: ['Foot soldiers', 'Horses', 'Chariots', 'Elephants', 'The counselor'],
    scene: 'kannauj.jpg',
    master: {
      img: 'bana.jpg', name: 'Bana, the court poet', from: "King Harsha's court, 600s", skin: '#c68e5f', hair: '#2b2140', coat: '#e8590c', beard: true,
      talk: [
        { who: 'master', text: "Welcome, Prince Liam. I write the story of King Harsha's court here in Kannauj." },
        { who: 'liam', text: 'What is that board with all the little soldiers?' },
        { who: 'master', text: 'Our whole army: foot soldiers, horses, chariots and elephants. The four members of an army – chaturanga!' },
        { who: 'master', text: 'In my book I joke that our kingdom is so peaceful, armies are only drawn up on chessboards.' },
        { who: 'hoppy', text: 'And I am one of the horses? Neigh!' },
      ],
    },
    games: [{ id: 'army', title: 'Meet your army' }],
    boss: { name: 'The Captain of the Guard', face: '🛡', kind: 'army' },
  },
  {
    id: 'persia', name: 'Persia', year: '500s', x: 1320, y: 445, open: true, color: '#0b7285',
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
    games: [{ id: 'riddle', title: 'The riddle of the elephant' }],
    boss: { name: 'The Indian envoy', face: '🐘', kind: 'riddle' },
  },
  { id: 'samarkand', name: 'Samarkand', year: '700s', x: 1365, y: 325, open: false, color: '#1971c2', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'baghdad', name: 'Baghdad', year: '762–946', x: 1210, y: 452, open: false, color: '#5f3dc4', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'north', name: 'The North', year: '1000–1200', x: 935, y: 118, open: false, color: '#495057', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'valencia', name: 'Valencia', year: '1475', x: 845, y: 372, open: false, color: '#c92a2a', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'rome', name: 'Rome', year: '1600', x: 972, y: 352, open: false, color: '#e8590c', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'vienna', name: 'Vienna', year: '1770', x: 1005, y: 272, open: false, color: '#a61e4d', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'paris', name: 'Paris', year: '1740–1858', x: 900, y: 298, open: false, color: '#1864ab', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  {
    id: 'london', name: 'London', year: '1849–1922', x: 878, y: 228, open: true, sea: true, color: '#364fc7',
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
    opening: 'London System',
    boss: { name: 'Lord Fog of London', face: '🎩', kind: 'london' },
  },
  { id: 'reykjavik', name: 'Reykjavík', year: '1972', x: 745, y: 120, open: false, sea: true, color: '#a61e4d', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'newyork', name: 'New York', year: '1886–1997', x: 440, y: 322, open: false, sea: true, color: '#343a40', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'orbit', name: 'Orbit', year: '1970 →', x: 1435, y: 245, open: false, color: '#2b2140', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'chennai', name: 'Chennai', year: 'today', x: 1515, y: 582, open: false, sea: true, color: '#5b36c9', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
  { id: 'rio', name: 'Rio', year: 'Trompowsky', x: 600, y: 692, open: false, sea: true, color: '#2b8a3e', intro: '', skills: [], games: [], boss: { name: '', face: '', kind: 'army' } },
]

// The War Tent on the map (it travels with Liam, but the map shows it near Kannauj)
export const TENT_AT = { x: 1600, y: 485 }

export const stationById = (id: string | undefined) => STATIONS.find((s) => s.id === id)

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

// Lord Fog plays Black and picks from the London lines; you answer with the move from the line
export const LORD_FOG: { fen: string; taunt: string; from: string; to: string; san: string; why: string; fromComment?: boolean }[] = [
  { fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', taunt: '1...d5 – the fog rolls in.', from: 'c1', to: 'f4', san: 'Bf4', why: 'Bishop out first: 2.Bf4, before e3 locks it in.' },
  { fen: 'rnbqkbnr/pp2pppp/8/2pp4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 0 3', taunt: '2...c5 – I hit your center!', from: 'e2', to: 'e3', san: 'e3', why: '3.e3 – open the way for your other bishop. Next comes c3.' },
  { fen: 'r1b1kbnr/pp2pppp/1qn5/2pp4/3P1B2/2P1P3/PP3PPP/RN1QKBNR w KQkq - 1 5', taunt: '4...Qb6 – your b2 pawn is mine!', from: 'd1', to: 'b3', san: 'Qb3', why: '5.Qb3 – offer a queen trade. Now b2 is protected.' },
  { fen: 'rn1qkb1r/ppp1pppp/5n2/3p1b2/3P1B2/4P3/PPP2PPP/RN1QKBNR w KQkq - 1 4', taunt: '3...Bf5 – I copy your bishop!', from: 'c2', to: 'c4', san: 'c4', why: '4.c4 – attack d5. Without its light bishop, b7 gets weak.' },
  // The trick from the comment of the 2...c5 line: "If Black plays Bf5 now, Qxf5 wins the bishop!"
  { fen: 'r3kb1r/pp2pppp/1qn2n2/3p1b2/2pP1B2/2P1P3/PPQN1PPP/R3KBNR w KQkq - 3 8', taunt: '7...Bf5 – your queen must run!', from: 'c2', to: 'f5', san: 'Qxf5', why: 'Nothing protects f5: 8.Qxf5 wins the bishop.', fromComment: true },
]

// Progress on this phone
const KEY = 'chess-trainer-king'
interface KingProgress {
  intro: boolean
  here: string
  beaten: string[]
}

export function loadKing(): KingProgress {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return { intro: false, here: 'kannauj', beaten: [], ...JSON.parse(saved) }
  } catch {
    // ignore
  }
  return { intro: false, here: 'kannauj', beaten: [] }
}

export function saveKing(p: KingProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // not remembered
  }
}
