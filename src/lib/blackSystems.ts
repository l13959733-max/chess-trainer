// The Black systems you can pick in #/black (Lu, 22.11.2026). Each groups the chapters ([Opening] headers) of
// your Black lines that belong to it. Descriptions are general opening facts, the tip is Hoppy's recommendation.

export interface BlackSystem {
  id: string
  name: string
  moves: string
  openings: string[] // chapters ([Opening] headers) of your Black lines that belong to it
  style: string
  tip?: string // Hoppy's pick, with the reason
}
export const BLACK_E4: BlackSystem[] = [
  { id: 'scandi', name: 'Scandinavian', moves: '1.e4 d5', openings: ['Scandinavian'], style: 'You hit the e4 pawn at once. White has few ways to avoid it, and your plan is mostly the same: queen out, knights out, castle.', tip: 'Fewest surprises: from move one the game goes your way.' },
  { id: 'caro', name: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5', openings: ['Caro-Kann'], style: 'A solid pawn wall. Safe and calm, but White has several systems (Advance, Exchange, main line) to learn.' },
  { id: 'french', name: 'French Defense', moves: '1.e4 e6 2.d4 d5', openings: ['French Defense'], style: 'Solid. The center often closes, then you attack White’s pawn chain with ...c5. Your light bishop can stay locked in.' },
  { id: 'e5', name: '1...e5', moves: '1.e4 e5', openings: ['Petrov Defense', 'Italian Game', 'Two Knights Defense', 'Ruy Lopez', 'Philidor Defense', "1.e4 e5: White's other tries"], style: 'Classical and open. White has many tries after 1...e5, so there is more to learn – against the Ruy Lopez (3.Bb5) you have only 2 lines so far.' },
  { id: 'dragon', name: 'Sicilian Dragon', moves: '1.e4 c5 … 5...g6', openings: ['Sicilian Dragon', "Sicilian: White's other tries"], style: 'Sharp and attacking. A lot of theory – one slip and your king is in danger.' },
  { id: 'najdorf', name: 'Sicilian Najdorf', moves: '1.e4 c5 … 5...a6', openings: ['Sicilian Najdorf', "Sicilian: White's other tries"], style: 'The sharpest weapon against 1.e4. The most theory of all.' },
  { id: 'pirc', name: 'Pirc Defense', moves: '1.e4 d6 2.d4 Nf6', openings: ['Pirc Defense'], style: 'Let White build a center, then attack it. Flexible, but White gets a lot of space.' },
]
export const BLACK_D4: BlackSystem[] = [
  { id: 'qgd', name: "Queen's Gambit Declined", moves: '1.d4 d5 2.c4 e6', openings: ["Queen's Gambit Declined", 'London & 2.Nf3'], style: 'Solid and classical: hold d5 with ...e6. Against the London and 2.Nf3 you strike with ...c5.', tip: 'It is your Catalan seen from the other side – the same pawns on d5 and e6, so what you learn as White helps you here.' },
  { id: 'slav', name: 'Slav Defense', moves: '1.d4 d5 2.c4 c6', openings: ['Slav Defense', 'London & 2.Nf3'], style: 'Hold d5 with ...c6, so your light bishop can still come out to f5.' },
  { id: 'kid', name: "King's Indian Defense", moves: '1.d4 Nf6 2.c4 g6', openings: ["King's Indian Defense"], style: 'Let White take the center, then attack it with ...e5 and later ...f5. A fighter’s opening.' },
  { id: 'nimzo', name: 'Nimzo-Indian', moves: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4', openings: ['Nimzo-Indian'], style: 'Pin White’s knight with ...Bb4 and fight for e4. Needs a second plan when White does not play 3.Nc3.' },
  { id: 'dutch', name: 'Dutch Defense', moves: '1.d4 f5', openings: ['Dutch Defense'], style: 'Fight for e4 with the f-pawn and attack on the kingside. Your king gets a little more open.' },
  { id: 'grunfeld', name: 'Grünfeld Defense', moves: '1.d4 Nf6 2.c4 g6 3.Nc3 d5', openings: ['Grünfeld Defense'], style: 'Give White the center, then hit it with pieces. Sharp and full of theory.' },
]
export function systemOf(vs: 'e4' | 'd4', id: string): BlackSystem | undefined {
  return (vs === 'e4' ? BLACK_E4 : BLACK_D4).find((s) => s.id === id)
}

