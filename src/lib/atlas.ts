// The opening atlas: the big opening families of chess, to widen your horizon.
// An entry with `opening` has real lines to learn (the [Opening] header of data/*.pgn);
// every family has lines now; new ones can be added without lines first.
export interface AtlasEntry {
  id: string
  name: string
  side: 'w' | 'b'
  against: string // which first moves it answers, e.g. "vs 1.e4"
  moves: string
  opening?: string
  fits: string // who it suits – a playing style, not a promise
}

export const ATLAS: AtlasEntry[] = [
  // White
  { id: 'italian', name: 'Italian Game', side: 'w', against: '1.e4 e5', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4', opening: 'Italian Game', fits: 'Fast development and a direct aim at f7.' },
  { id: 'ruy', name: 'Ruy Lopez', side: 'w', against: '1.e4 e5', moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5', opening: 'Ruy Lopez', fits: 'Slow pressure that lasts the whole game.' },
  { id: 'scotch', name: 'Scotch Game', side: 'w', against: '1.e4 e5', moves: '1.e4 e5 2.Nf3 Nc6 3.d4', opening: 'Scotch Game', fits: 'Open the center at once – clear and active.' },
  { id: 'vienna', name: 'Vienna Game', side: 'w', against: '1.e4 e5', moves: '1.e4 e5 2.Nc3', opening: 'Vienna Game', fits: 'Attacking players who like the f-pawn push.' },
  { id: 'london', name: 'London System', side: 'w', against: '1.d4 d5', moves: '1.d4 d5 2.Bf4', opening: 'London System', fits: 'The same solid setup against almost everything.' },
  { id: 'qg', name: "Queen's Gambit", side: 'w', against: '1.d4 d5', moves: '1.d4 d5 2.c4', opening: "Queen's Gambit", fits: 'Classical central play – a pawn offer for the center.' },
  { id: 'trompowsky', name: 'Trompowsky', side: 'w', against: '1.d4 Nf6', moves: '1.d4 Nf6 2.Bg5', opening: 'Trompowsky', fits: 'Get your opponent out of the book on move 2.' },
  { id: 'english', name: 'English Opening', side: 'w', against: 'first move', moves: '1.c4', opening: 'English Opening', fits: 'Patient players who like to fight for d5 from the side.' },
  { id: 'reti', name: 'Réti Opening', side: 'w', against: 'first move', moves: '1.Nf3 d5 2.c4', opening: 'Réti Opening', fits: 'Flexible: decide your center later.' },
  { id: 'kings-gambit', name: "King's Gambit", side: 'w', against: '1.e4 e5', moves: '1.e4 e5 2.f4', opening: "King's Gambit", fits: 'Romantic attackers who give a pawn for the f-file.' },
  { id: 'catalan', name: 'Catalan', side: 'w', against: '1.d4 Nf6', moves: '1.d4 Nf6 2.c4 e6 3.g3', opening: 'Catalan', fits: 'Long pressure with the bishop on g2.' },
  // Black against 1.e4
  { id: 'scandinavian', name: 'Scandinavian', side: 'b', against: 'vs 1.e4', moves: '1.e4 d5', opening: 'Scandinavian', fits: 'Hit the center on move 1 – few lines to learn.' },
  { id: 'caro', name: 'Caro-Kann', side: 'b', against: 'vs 1.e4', moves: '1.e4 c6', opening: 'Caro-Kann', fits: 'Solid structure, good endgames.' },
  { id: 'french', name: 'French Defense', side: 'b', against: 'vs 1.e4', moves: '1.e4 e6', opening: 'French Defense', fits: 'Closed centers and attacks on the pawn chain.' },
  { id: 'dragon', name: 'Sicilian Dragon', side: 'b', against: 'vs 1.e4', moves: '1.e4 c5 … g6', opening: 'Sicilian Dragon', fits: 'Sharp attacks on opposite sides of the board.' },
  { id: 'najdorf', name: 'Sicilian Najdorf', side: 'b', against: 'vs 1.e4', moves: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6', opening: 'Sicilian Najdorf', fits: 'Rich and sharp – lots of theory.' },
  { id: 'open-e5', name: '1...e5 (Italian, Two Knights)', side: 'b', against: 'vs 1.e4', moves: '1.e4 e5', opening: 'Italian Game', fits: 'Classical: develop, castle, fight for the center.' },
  { id: 'pirc', name: 'Pirc Defense', side: 'b', against: 'vs 1.e4', moves: '1.e4 d6 2.d4 Nf6 3.Nc3 g6', opening: 'Pirc Defense', fits: 'Let White build a center, then hit it.' },
  // Black against 1.d4
  { id: 'qgd', name: "Queen's Gambit Declined", side: 'b', against: 'vs 1.d4', moves: '1.d4 d5 2.c4 e6', opening: "Queen's Gambit Declined", fits: 'One of the most trusted defenses – solid and clear.' },
  { id: 'slav', name: 'Slav Defense', side: 'b', against: 'vs 1.d4', moves: '1.d4 d5 2.c4 c6', opening: 'Slav Defense', fits: 'Solid like the QGD, but your light bishop stays free.' },
  { id: 'kid', name: "King's Indian", side: 'b', against: 'vs 1.d4', moves: '1.d4 Nf6 2.c4 g6', opening: "King's Indian Defense", fits: 'Fighters: let White have the center, then attack the king.' },
  { id: 'nimzo', name: 'Nimzo-Indian', side: 'b', against: 'vs 1.d4', moves: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4', opening: 'Nimzo-Indian', fits: 'Pin, trade, and play against weak pawns.' },
  { id: 'grunfeld', name: 'Grünfeld', side: 'b', against: 'vs 1.d4', moves: '1.d4 Nf6 2.c4 g6 3.Nc3 d5', opening: 'Grünfeld Defense', fits: 'Dynamic: give White the center, then destroy it.' },
  { id: 'dutch', name: 'Dutch Defense', side: 'b', against: 'vs 1.d4', moves: '1.d4 f5', opening: 'Dutch Defense', fits: 'Unbalanced games with a kingside attack.' },
]
