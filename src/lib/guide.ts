// What each chapter is about: short description, the main ideas, how risky it is, and a fun fact.
// Keyed like chapters: `${opening}|${side}`. Facts are well-documented chess history only.

export type Style = 'Solid' | 'Active' | 'Sharp' | 'Gambit'

export interface Guide {
  about: string
  ideas: string[]
  style: Style
  fact?: string
  story?: string[] // longer background: history and the main idea, shown folded
  rewards?: string[] // one after each finished line of this opening, in turn
}

const ITALIAN_FACT = 'One of the oldest openings: Italian masters like Polerio and Greco studied it around 1600. "Giuoco Piano" is Italian for "quiet game".'

export const GUIDE: Record<string, Guide> = {
  'Italian Game|w': {
    about: 'You develop fast and point your bishop at f7, the weakest square next to Black\'s king.',
    ideas: ['Knights and bishops out, castle early', 'c3 and d4 for a big center, or d3 for a slow build-up', 'Watch f7 for tricks'],
    style: 'Solid',
    fact: ITALIAN_FACT,
  },
  'Two Knights Defense|w': {
    about: 'Black attacks e4 instead of copying you. Here Ng5 hits f7 twice – and the Fried Liver can happen.',
    ideas: ['4.Ng5 attacks f7 with two pieces', 'After 5...Nxd5? the knight sacrifice Nxf7 works', 'Calm 4.d3 is what strong players often choose'],
    style: 'Sharp',
    fact: 'The Fried Liver comes from the Italian "Fegatello". The sacrifice was already played in the 1600s.',
  },
  'Ruy Lopez|w': {
    about: 'The Spanish Game: your bishop attacks the knight that protects e5. Played by world champions for 150 years.',
    ideas: ['Bb5, castle, Re1, then c3 and d4', 'Retreat the bishop to a4, b3 and c2 – it stays on the long diagonal', 'Against the Berlin, calm d3 is easy and good'],
    style: 'Solid',
    fact: 'Named after Ruy López de Segura, a Spanish priest who wrote about it in 1561.',
  },
  'Ruy Lopez|b': {
    about: 'Against the Spanish you play ...a6, ...Nf6 and a solid setup – and you know the Noah\'s Ark trap.',
    ideas: ['...a6 and ...b5 push the bishop back', '...Na5 chases the bishop away from the long diagonal', 'Hold e5 with ...d6'],
    style: 'Solid',
    fact: 'Named after Ruy López de Segura, a Spanish priest who wrote about it in 1561.',
  },
  'Petrov Defense|w': {
    about: 'Black copies you with 2...Nf6 and attacks e4. Very solid for Black – but there is one famous trap.',
    ideas: ['Take on e5 first, then retreat with Nf3 after ...d6', 'If Black takes back too early, Qe2 wins material'],
    style: 'Solid',
    fact: 'Also called the Russian Game, after the 19th-century Russian master Alexander Petrov.',
  },
  'Philidor Defense|w': {
    about: 'Black protects e5 with ...d6. Solid but a bit passive, so you get more space.',
    ideas: ['Hit the center with d4 at once', 'Develop fast and gain space with f4', 'Watch for the Légal trap if Black pins with ...Bg4'],
    style: 'Solid',
    fact: 'Named after François-André Philidor – the best player of the 1700s and also a famous opera composer.',
  },
  'Vienna Game|w': {
    about: 'Knight to c3 instead of f3: you keep the f-pawn free to push to f4 and attack.',
    ideas: ['f4 attacks e5 (the Vienna Gambit)', 'Bc4 aims at f7 like in the Italian', 'Protect e4 with d3 when the bishop is out'],
    style: 'Active',
    fact: 'Named after the city of Vienna, where it was popular in the 1800s.',
  },
  "Bishop's Opening|w": {
    about: 'The bishop goes to c4 on move two. It often turns into the Italian or the Vienna.',
    ideas: ['Bc4 looks at f7 at once', 'd3 and Nf3: calm and safe', 'Avoid early queen trips'],
    style: 'Solid',
    fact: 'One of the oldest openings of all: it is already in Lucena\'s chess book from 1497.',
  },
  'Trompowsky|w': {
    about: 'After 1.d4 Nf6 your bishop jumps to g5 at once. Black has to react right away, and many natural moves are already mistakes.',
    ideas: ['If the knight comes to e4: Bf4, then f3 kicks it', 'Bxf6 doubles Black\'s pawns', 'Against ...c5: push d5 and grab space'],
    style: 'Active',
    fact: 'Named after the Brazilian master Octávio Trompowsky, who played it in the 1930s and 1940s.',
    story: [
      'Octávio Trompowsky (1897–1984) was a Brazilian chess champion. He played 2.Bg5 again and again in the 1930s and 1940s, so the opening got his name.',
      'For a long time it was only a small side line. Then, in the 1980s, the English grandmasters Julian Hodgson and Nigel Short played it and showed it is a real weapon. That is why in England it is often called the Hodgson Attack.',
      'Why 2.Bg5? After 1.d4 Nf6 Black usually wants to play a big, well-known system (King\'s Indian, Nimzo-Indian, Grünfeld). The bishop on g5 gives no time for that: Black has to deal with it right now, often in positions they know less well.',
      'Your dark bishop comes out before e3 can lock it in. If you take on f6, you give up the bishop pair, but Black gets doubled pawns or loses time – and you keep a solid center and quick development.',
      'Three things to remember: against ...Ne4 go Bf4 and kick the knight with f3; against ...c5 push d5 and take space; against ...e6 take the center with e4 – and watch for Black grabbing e4 while the queen stands on d8.',
    ],
    rewards: [
      'Octávio Trompowsky was born in Rio de Janeiro in 1897 and died there in 1984.',
      'In 1939 Trompowsky became the chess champion of Brazil.',
      'At the 1939 Chess Olympiad in Buenos Aires, Trompowsky played on board one for Brazil – against world champions like Alekhine and Capablanca.',
      'Trompowsky played 2.Bg5 in the 1930s and 1940s – almost 100 years ago, and it still surprises players today.',
      'In the 1980s the English grandmasters Julian Hodgson and Nigel Short brought the opening back. In England many still call it the Hodgson Attack.',
      'World champion Magnus Carlsen played the Trompowsky in the very first game of his 2016 World Championship match against Sergey Karjakin.',
    ],
  },
  'London System|w': {
    about: 'Against 1...d5 you play Bf4, e3, Nf3, c3, Nbd2 and Bd3 – almost the same setup against everything Black does.',
    ideas: ['Bishop to f4 before e3 locks it in', 'c3 protects d4: a strong pawn chain', 'Against ...Bd6 step back with Bg3 and keep your bishop'],
    style: 'Solid',
    fact: 'The name comes from the strong London tournament of 1922, where it was played seven times. Ding Liren won a game with it at the 2023 World Championship.',
  },
  'Levitsky Attack|w': {
    about: 'Against 1...d5 you play 2.Bg5 – the same bishop move as in the Trompowsky, so one idea works against 1...Nf6 and 1...d5.',
    ideas: ['Bxf6 doubles Black\'s pawns', 'Against ...Qb6 protect b2 with Qc1 or Qb3', 'Then c4 hits the center'],
    style: 'Active',
    fact: 'Named after the Russian master Stepan Levitsky. It is also called the Queen\'s Bishop Attack or the Hodgson Attack.',
  },
  'Queen\'s Gambit|w': {
    about: 'After 1.d4 d5 you play 2.c4 and offer a pawn to pull Black\'s pawn away from the center. The classic way to play 1.d4.',
    ideas: ['If Black takes on c4, you win the pawn back with e3 and Bxc4', 'Pin the knight with Bg5', 'Watch out for the Elephant Trap: don\'t grab d5 too early'],
    style: 'Active',
    fact: 'One of the oldest openings: it already appears in the Göttingen manuscript from around 1490.',
  },
  'Other replies to 1.d4|w': {
    about: 'Black does not always play 1...d5 or 1...Nf6. Against many moves you simply play 2.e4 and are back in your 1.e4 lines.',
    ideas: ['1...e6, 1...c6, 1...d6, 1...g6: play 2.e4', 'Against the Dutch (1...f5): Bg5, like in the Trompowsky', 'Against 1...c5: push d5'],
    style: 'Active',
    fact: 'When two move orders reach the same position, it is called a transposition: 1.d4 e6 2.e4 is the same as 1.e4 e6 2.d4.',
  },
  'Scandinavian|w': {
    about: 'Black attacks e4 at once with 1...d5. Take the pawn and chase the queen with your pieces.',
    ideas: ['2.exd5 is the best answer', 'Nc3 hits the queen – you develop with tempo', 'Kick a bishop on f5 or g4 with pawns'],
    style: 'Active',
    fact: 'The oldest recorded game of modern chess, Castellví–Vinyoles from Valencia 1475, started 1.e4 d5.',
  },
  'Caro-Kann|w': {
    about: 'Black prepares ...d5 with a pawn behind it. A rock-solid defense, so you take space.',
    ideas: ['Advance e5 to gain space', 'In the Classical, chase the bishop with Ng3 and h4', 'Remember the smothered-mate trap Nd6#'],
    style: 'Solid',
    fact: 'Named after Horatio Caro and Marcus Kann, who analysed it in the 1880s.',
  },
  'French Defense|w': {
    about: 'Black plays ...e6 and ...d5. Black\'s light bishop is often stuck behind its own pawns.',
    ideas: ['e5 takes space and locks the bishop in', 'c3 supports d4 – a strong pawn chain', 'Black attacks your chain with ...c5 and ...f6'],
    style: 'Solid',
    fact: 'Named after a correspondence match London vs Paris in 1834, where the Paris team played it.',
  },
  'Sicilian Defense|w': {
    about: 'The most popular answer to 1.e4. Black fights for d4 from the side. You avoid the big theory with 2.c3 or a gambit.',
    ideas: ['Alapin 2.c3: build a big center with d4', 'Smith-Morra: give a pawn for fast development', 'Wing Gambit 2.b4: fun but risky'],
    style: 'Active',
    fact: 'The Smith-Morra is named after Pierre Morra from France and Ken Smith from Texas.',
  },
  'Pirc & Modern|w': {
    about: 'Black lets you build a big center and attacks it later. Take the space you get.',
    ideas: ['Pawns on e4 and d4', 'Be3, Qd2 and castle long', 'Push your king-side pawns later'],
    style: 'Active',
    fact: 'The Pirc is named after the Slovenian grandmaster Vasja Pirc.',
  },
  'Nimzowitsch Defense|w': {
    about: '1...Nc6 is rare. Develop normally and use your space.',
    ideas: ['Nf3 and d4', 'Kick the pieces with d5 and h3'],
    style: 'Solid',
    fact: 'Named after Aron Nimzowitsch, whose book "My System" (1925) is still read by club players.',
  },
  'Scandinavian|b': {
    about: 'You attack e4 right away and take back with the queen. Few things to learn, clear plans.',
    ideas: ['Queen to a5 or d6 – safe from attacks', 'Bishop out to f5 or g4 BEFORE ...e6', '...c6 gives the queen a home on c7'],
    style: 'Solid',
    fact: 'The oldest recorded game of modern chess, Castellví–Vinyoles from Valencia 1475, started 1.e4 d5.',
  },
  'Caro-Kann|b': {
    about: 'You prepare ...d5 with ...c6, so your center is protected. Very solid and hard to beat.',
    ideas: ['Bishop out to f5 before ...e6', 'Hit White\'s pawn chain with ...c5', 'Beware Nd6# when your knights block your king'],
    style: 'Solid',
    fact: 'Named after Horatio Caro and Marcus Kann, who analysed it in the 1880s.',
  },
  'Sicilian Dragon|b': {
    about: 'Your bishop on g7 breathes fire down the long diagonal. Both sides attack the other king – very sharp.',
    ideas: ['Bishop to g7, castle short', 'Your attack runs on the c-file: ...Rc8, ...Ne5-c4', 'Against the Yugoslav Attack, ...d5 strikes back in the center'],
    style: 'Sharp',
    fact: 'Named around 1900 by Fyodor Dus-Chotimirsky, an amateur astronomer: Black\'s pawns look like the star constellation Draco, the dragon.',
  },
  "Sicilian: White's other tries|b": {
    about: 'Many players avoid the main lines of the Sicilian. Here is what to do against the most common side lines.',
    ideas: ['Smith-Morra: take the pawn, develop solidly', 'Alapin 2.c3: hit e4 with ...Nf6', 'Grand Prix: fianchetto your bishop'],
    style: 'Active',
  },
  'Other replies to 1.e4|w': {
    about: 'Rare answers to 1.e4, like Owen\'s Defense 1...b6. Black gives you the center – take it.',
    ideas: ['d4: two pawns in the center', 'Protect e4 with pieces, not with pawn moves', 'Develop fast while Black plays on the wing'],
    style: 'Solid',
  },
  'Alekhine Defense|w': {
    about: 'Black\'s knight on f6 invites your pawns forward. You chase it and take space – then develop calmly.',
    ideas: ['e5 chases the knight, d4 and c4 build a big center', 'Do not push too far: develop first', 'More space means more room for your pieces'],
    style: 'Active',
  },
  "1.e4 e5: White's other tries|b": {
    about: 'Not every White player plays 2.Nf3. Here is what to do against the early queen, the Vienna, the Center Game and the Scotch.',
    ideas: ['Against an early queen: develop with tempo and protect f7', 'Answer a strike in the center with your own strike', 'Make the queen move again and again'],
    style: 'Active',
  },
  'Italian Game|b': {
    about: 'You answer the Italian with ...Bc5: your bishop aims at f2 just like White\'s aims at f7.',
    ideas: ['...Nf6 hits e4', '...d5 breaks the center when White plays d4', 'Calm setups: ...d6, ...a6, ...Ba7'],
    style: 'Solid',
    fact: ITALIAN_FACT,
  },
  'Two Knights Defense|b': {
    about: '3...Nf6 counter-attacks e4. You must know how to meet 4.Ng5.',
    ideas: ['Against 4.Ng5: ...d5 and ...Na5 – never ...Nxd5', 'Give a pawn for fast development', 'Against 4.d4: take and fight back'],
    style: 'Active',
    fact: 'The Fried Liver comes from the Italian "Fegatello". The sacrifice was already played in the 1600s.',
  },
  'Philidor Defense|b': {
    about: 'Solid ...d6, protecting e5. Be careful with your bishop on g4.',
    ideas: ['Take the knight on f3 instead of retreating to h5', 'Develop and castle'],
    style: 'Solid',
    fact: 'Légal\'s Mate is named after Sire de Légal, who was Philidor\'s chess teacher in Paris.',
  },
  "Queen's Gambit Declined|b": {
    about: 'White offers the c-pawn, you keep your center with ...e6. One of the most trusted defenses ever.',
    ideas: ['Hold d5 with ...e6', 'Develop, castle, then ...c5 or ...b6 and ...Bb7', 'Know the Elephant Trap'],
    style: 'Solid',
    fact: 'It is not a real gambit: White can almost always win the pawn back. The TV series "The Queen\'s Gambit" (2020) made it world-famous.',
  },
  'London & 2.Nf3|b': {
    about: 'White plays a calm system with Bf4 or Nf3. Hit the center with ...c5.',
    ideas: ['...c5 at once', 'Trade White\'s strong bishop with ...Bd6', 'Your light bishop goes to b7'],
    style: 'Solid',
    fact: 'Called the London System because it was played a lot at the London tournament of 1922.',
  },
  'Other first moves|b': {
    about: 'Answers to 1.c4, 1.Nf3, 1.f4, 1.b3 and 1.g3. Often you can go back into a setup you know.',
    ideas: ['...d5 and ...e6: like the Queen\'s Gambit Declined', 'Take the center when White doesn\'t'],
    style: 'Solid',
    fact: 'With 1.Nf3 Richard Réti beat Capablanca in New York 1924 – Capablanca\'s first loss in eight years.',
  },
}

export function guideFor(opening: string | undefined, side: string | null): Guide | undefined {
  return opening ? GUIDE[`${opening}|${side}`] : undefined
}

// Where a line leaves the other lines of its chapter: the first move that is different.
// Returns e.g. "3...Qd6", or null if the line is the only one.
export function branchMove(line: { moves: { san: string; color: 'w' | 'b' }[] }, others: { moves: { san: string }[] }[]): string | null {
  let common = 0
  for (const o of others) {
    if (o === line) continue
    let i = 0
    while (i < line.moves.length && i < o.moves.length && line.moves[i].san === o.moves[i].san) i++
    common = Math.max(common, i)
  }
  if (others.length < 2 || common >= line.moves.length) return null
  const m = line.moves[common]
  const no = Math.floor(common / 2) + 1
  return `${no}.${m.color === 'b' ? '..' : ''}${m.san}`
}

// The next reward fact for an opening (each finished line shows the following one)
export function nextReward(opening: string | undefined, side: 'w' | 'b'): string | null {
  const facts = opening ? GUIDE[`${opening}|${side}`]?.rewards : undefined
  if (!facts?.length) return null
  const key = 'chess-trainer-reward:' + opening + '|' + side
  let n = 0
  try {
    n = Number(localStorage.getItem(key)) || 0
    localStorage.setItem(key, String(n + 1))
  } catch {
    // private mode: always the first one
  }
  return facts[n % facts.length]
}
