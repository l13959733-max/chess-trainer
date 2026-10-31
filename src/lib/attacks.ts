// "Attacks & Traps": famous attacks next to the defense against them. Lines are found by title.

export interface Theme {
  name: string
  about: string
  attack: string[] // line titles: how to play the attack or trap
  defense: string[] // line titles: how to stay safe against it
}

export const THEMES: Theme[] = [
  {
    name: 'Fried Liver Attack',
    about: 'White sacrifices a knight on f7 and drags Black\'s king into the middle of the board.',
    attack: ['Two Knights: Fried Liver Attack'],
    defense: ['Two Knights (Black): 4.Ng5 d5 5.exd5 Na5'],
  },
  {
    name: 'Traxler Counterattack',
    about: 'Black ignores the threat on f7 and hits back on f2 – a wild race against the white king.',
    attack: ['Traxler Counterattack (Black)'],
    defense: ['Two Knights: Avoiding the Traxler'],
  },
  {
    name: "Légal's Mate",
    about: 'A queen sacrifice that ends in checkmate with three small pieces.',
    attack: ["Trap: Légal's Mate"],
    defense: ["Philidor (Black): Avoid Légal's Mate"],
  },
  {
    name: 'Smothered Mate (Caro-Kann)',
    about: 'The king is boxed in by its own pieces and a knight gives mate on d6.',
    attack: ['Trap: Smothered Mate in the Caro-Kann'],
    defense: ['Caro-Kann: 4...Nd7 and the Smothered Mate'],
  },
  {
    name: 'Siberian Trap',
    about: 'In the Smith-Morra, Black\'s queen and knight team up for mate on h2.',
    attack: ['Trap (Black): The Siberian Trap'],
    defense: ['vs Sicilian: Smith-Morra Gambit Accepted'],
  },
  {
    name: 'Elephant Trap',
    about: 'White grabs a pawn on d5 – and loses a whole piece to a check with the bishop.',
    attack: ['Trap (Black): The Elephant Trap'],
    defense: [],
  },
  {
    name: "Noah's Ark Trap",
    about: 'White\'s bishop on b3 gets locked in by a wall of black pawns.',
    attack: ["Trap (Black): Noah's Ark"],
    defense: ['Ruy Lopez: Closed Main Line'],
  },
  {
    name: 'Petrov Trap',
    about: 'Copying White too early in the Petrov loses the queen to a discovered check.',
    attack: ['Trap: Petrov 3...Nxe4?'],
    defense: [],
  },
  {
    name: 'Blackburne Shilling Trap',
    about: 'Black leaves e5 hanging; if White grabs it, the black queen attacks g2. Know how to answer it.',
    attack: [],
    defense: ['Italian: Blackburne Shilling Trap 3...Nd4'],
  },
  {
    name: 'Evans Gambit',
    about: 'White gives the b-pawn for fast development and an attack.',
    attack: ['Evans Gambit Accepted', 'Evans Gambit Declined'],
    defense: ['Evans Gambit (Black): Lasker Defense'],
  },
  {
    name: 'Marshall Attack',
    about: 'Black gives a pawn in the Spanish to start a big attack on the white king.',
    attack: [],
    defense: ['Ruy Lopez: The Marshall Attack'],
  },
  {
    name: 'Vienna Gambit',
    about: 'f4 early: White attacks e5 and opens the f-file.',
    attack: ['Vienna: Gambit 3.f4 d5', 'Vienna: Gambit 3...exf4'],
    defense: [],
  },
  {
    name: 'Smith-Morra Gambit',
    about: 'White gives a pawn against the Sicilian for fast development and open lines.',
    attack: ['vs Sicilian: Smith-Morra Gambit Accepted', 'vs Sicilian: Smith-Morra Declined 3...Nf6'],
    defense: ['Sicilian (Black): Smith-Morra Accepted'],
  },
  {
    name: 'Wing Gambit',
    about: 'White gives the b-pawn to pull Black\'s c-pawn away from the center. Risky but fun.',
    attack: ['vs Sicilian: Wing Gambit 2.b4'],
    defense: [],
  },
  {
    name: 'Yugoslav Attack vs the Dragon',
    about: 'White castles long and storms the king side; Black races on the c-file.',
    attack: [],
    defense: ['Dragon: Yugoslav Attack 9.Bc4', 'Dragon: Yugoslav 9.O-O-O d5!'],
  },
  {
    name: 'Blackmar-Diemer Gambit',
    about: 'Against the Scandinavian, White gives a pawn with 2.d4 for a quick attack.',
    attack: [],
    defense: ['Scandinavian: Blackmar-Diemer Gambit 2.d4'],
  },
  {
    name: 'Icelandic Gambit',
    about: 'Black gives a pawn in the Scandinavian for development.',
    attack: [],
    defense: ['vs Scandinavian: Icelandic Gambit 3.c4 e6'],
  },
]
