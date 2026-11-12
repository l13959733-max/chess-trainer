// Every city as a book chapter (Lu, 12.11., BAUPLAN 26): a cover, a chapter with its table of contents, and the story told
// for grown-ups – no children's dialogue. Only facts that are already checked in the app (king.ts) or researched (Barcelona).
// Colours per region (Lu: terracotta for India, Persia and the south; New York, Rio … their own).

export interface Region {
  name: string
  color: string // the house colour of the reading page
  accent: string
}
const R = {
  in: { name: 'India', color: '#7a3420', accent: '#e0a23a' },
  or: { name: 'The Silk Road', color: '#7a3420', accent: '#2f9c9a' },
  es: { name: 'The Mediterranean', color: '#7a3420', accent: '#e2a42b' },
  fr: { name: 'Paris & Vienna', color: '#5c1f2e', accent: '#c9a24a' },
  uk: { name: 'Britain', color: '#22402f', accent: '#b8892f' },
  no: { name: 'The North', color: '#2d4656', accent: '#d9d2c3' },
  ny: { name: 'New York', color: '#1b2a45', accent: '#d4a843' },
  br: { name: 'Brazil', color: '#0f5536', accent: '#f2c230' },
  sp: { name: 'Orbit', color: '#221d45', accent: '#b9c4d6' },
  ru: { name: 'Russia', color: '#6b1d1d', accent: '#d8b25a' },
} satisfies Record<string, Region>

export interface Chapter {
  region: Region
  subtitle: string // under the city name on the cover
  headline: string // the chapter title: the idea you learn here
  story: string[] // told like a good history book
  board?: string[] // "On the board": the chess idea in one or two sentences
  cover?: string // picture in public/king/book (default: <id>.jpg)
  storyImg?: string
  black?: string // the station whose lines you play here as Black (the former Mirror World)
}

export const BOOK: Record<string, Chapter> = {
  kannauj: {
    region: R.in,
    subtitle: 'Where it all began',
    headline: 'An army on a table',
    story: [
      'In India in the 600s, people played a game with a whole army on one board: foot soldiers, horses, chariots and elephants.',
      'They called it chaturanga – “four parts” in Sanskrit, the four parts of an Indian army.',
      'A writer of the time joked that his kingdom was so peaceful that armies were only drawn up on chessboards.',
    ],
    board: ['A good general asks before every move: what does the enemy attack – and what is guarded?'],
    black: 'mirror-kid',
  },
  samarkand: {
    region: R.or,
    subtitle: 'The game travels the Silk Road',
    headline: 'One jump, two targets',
    story: [
      'In the 700s, caravans from India, Persia and China met in the markets of Samarkand – and with the silk and the spices, the game travelled east and west.',
      'The pieces were not abstract shapes but a little army: a king, a counsellor, a chariot, an elephant, two horsemen and a foot soldier.',
      'In 1977 archaeologists found such a set of ivory figures in the ruins of Afrasiab, right here – some of the oldest chess pieces known.',
    ],
    board: ['The horse’s best trick is the fork: one jump that attacks two things at once.'],
  },
  rome: {
    region: R.es,
    subtitle: 'A master writes down his games',
    headline: 'Aim at f7',
    story: [
      'Around 1600, Gioachino Greco travelled from court to court. He wrote chess games by hand for rich patrons and played wherever he went – many call him the first professional chess player.',
      'His favourite plan: bring the bishop to c4 and aim at f7, the weakest point next to the black king. The Italian Game.',
      'Italian masters like Polerio and Greco studied it around 1600, which makes it one of the oldest openings. “Giuoco Piano” is Italian for “quiet game”.',
    ],
    board: ['After 1.e4 e5 2.Nf3 your opponent can answer in many ways. For each answer you need a plan – and you must know the traps.'],
  },
  baghdad: {
    region: R.or,
    subtitle: 'The round city on the Tigris',
    headline: 'The first books of puzzles',
    story: [
      'Between 762 and 946, Baghdad was the round city on the Tigris – and here chess got its first famous masters. Even the caliphs watched their games.',
      'Al-Adli wrote one of the first books about chess, full of puzzles: a position and one question – how do you win from here?',
      'The best player of his age, al-Suli, left a puzzle with only four pieces. People say nobody solved it for a thousand years.',
    ],
    board: ['To play without looking at the board, you must know every square by its name.'],
  },
  persia: {
    region: R.or,
    subtitle: 'A board without rules',
    headline: 'Find the rule',
    story: [
      'In the 500s, an envoy from India brought a board to King Khosrau of Persia – with no rules, only a riddle.',
      'The king’s chief minister, Buzurgmihr, worked the rules out in one day and one night. At least that is how the Book of Kings tells it.',
    ],
    board: ['Watch how a piece moves, and you will find its rule.'],
  },
  north: {
    region: R.no,
    subtitle: 'Chess reaches the far north',
    headline: 'Rooks that bite their shields',
    story: [
      'Between 1000 and 1200 the game reached the far north. Carvers made chessmen from walrus ivory: kings on thrones, knights on sturdy horses.',
      'The rooks became warriors biting their shields – berserkers.',
      'Where the south had an elephant, the north had a bishop. Some say the two points of the old elephant piece looked like a bishop’s hat.',
      'In 1831 a whole hoard of pieces like these was found on the Isle of Lewis in Scotland – the Lewis chessmen.',
    ],
    black: 'mirror-gate',
  },
  valencia: {
    region: R.es,
    subtitle: 'The queen gets the whole board',
    headline: 'The mad queen',
    story: [
      'For about 500 years the queen moved only one square at a time. Around 1475, poets in Valencia wrote a poem about a game of chess – with a brand-new queen.',
      'Suddenly she could move as far as she liked, in any direction. People called it the “mad queen’s chess”.',
      'In 1561 the Spanish priest Ruy López printed his own chess book. His name stuck to an opening: 1.e4 e5 2.Nf3 Nc6 3.Bb5 – the Ruy Lopez.',
    ],
  },
  barcelona: {
    region: R.es,
    subtitle: 'A tournament by the sea',
    headline: 'The long diagonal',
    cover: 'barcelona.jpg',
    storyImg: 'barcelona-story.jpg',
    story: [
      'In 1929 Barcelona opens its doors to the world. The International Exposition fills the city, and alongside it, from late September to mid-October, a chess tournament is played.',
      'The man everyone wants to beat is José Raúl Capablanca of Cuba, the former world champion. Nobody does. He wins thirteen games, draws one and does not lose a single game.',
      'Next to him sits Savielly Tartakower, the second big name in a field of mostly local players. The organisers have a wish for him: an opening in honour of Catalonia.',
      'Tartakower’s answer is quiet but cunning. 1.d4, then c4, and then the move that gives it all away: g3. The bishop goes to g2.',
      'The idea itself was not brand new. But from that autumn on, it has a name: the Catalan.',
    ],
    board: [
      'From g2 the bishop looks down the long diagonal – d5, c6, b7, a8 – and presses on Black’s whole queenside without moving a step.',
      'Black often grabs the pawn on c4. Don’t chase it. Castle first; the queen or a knight wins it back later.',
    ],
  },
  palace: {
    region: R.fr,
    subtitle: 'An old manuscript',
    headline: 'Offer a pawn, take the centre',
    story: [
      'In a library lies a manuscript written in Göttingen around 1490.',
      'It is one of the oldest places where this opening appears: 1.d4 d5 2.c4 – the Queen’s Gambit.',
    ],
    board: ['You offer the c-pawn. If Black takes, you win it back with e3 and Bxc4 – and you have the centre.'],
  },
  vienna: {
    region: R.fr,
    subtitle: 'A machine that plays chess',
    headline: 'Who is inside the box?',
    story: [
      'In 1770 Wolfgang von Kempelen showed Empress Maria Theresa a chess machine: the Turk.',
      'A machine that played chess – and won. The question everyone asked: who, or what, was inside the box?',
    ],
    black: 'mirror-caro',
  },
  paris: {
    region: R.fr,
    subtitle: 'The famous chess café',
    headline: 'Know the road against every answer',
    story: [
      'The best players in Paris met at the Café de la Régence.',
      'François-André Philidor wrote operas for a living, but chess was his passion. His teacher here was Légal – whose trap is in your book.',
      'In 1858 a young American, Paul Morphy, won games here that amazed everyone.',
    ],
    black: 'mirror-paris',
  },
  edinburgh: {
    region: R.uk,
    subtitle: 'A match by letter',
    headline: 'Open the centre at once',
    story: [
      'In 1824 Edinburgh played London at chess – by letter. Every move travelled for days.',
      'From that match the opening 1.e4 e5 2.Nf3 Nc6 3.d4 got its name: the Scotch Game.',
    ],
    board: ['Do not wait. Open the centre on move 3, take back with the knight, and develop fast.'],
  },
  london: {
    region: R.uk,
    subtitle: 'A system named after a city',
    headline: 'Bishop out before e3',
    story: [
      'At the big London tournament of 1922 one setup was played seven times. That gave it its name: the London System.',
      'One more weapon carries the name of this country. Howard Staunton of London played 1.c4 in his match of 1843 against Saint-Amant – that is why it is called the English Opening.',
      'And in London in 1851, Adolf Anderssen won the famous “Immortal Game” – with the King’s Gambit.',
    ],
    board: ['Bring your bishop to f4 before you play e3. Then build a strong pawn chain.'],
    black: 'mirror-fortress',
  },
  forest: {
    region: R.no,
    subtitle: 'A master in the snow',
    headline: 'The bishop jumps out',
    story: ['Around 1910, the Russian master Stepan Levitsky liked to answer 1.d4 d5 with an early jump: 2.Bg5. The opening carries his name.'],
    board: ['It is the same bishop jump as the Trompowsky – one idea for two answers.'],
    black: 'mirror-slav',
  },
  moscow: {
    region: R.ru,
    subtitle: 'The Russian school',
    headline: 'Attack back: 2...Nf6',
    story: [
      'Alexander Petrov, born in 1794, was for more than half a century the strongest chess player in Russia.',
      'Together with Carl Jaenisch he analysed a calm answer to 1.e4 e5 2.Nf3: do not defend your pawn – attack White’s with 2...Nf6. It carries his name, the Petrov Defense, also called the Russian Game.',
      'In late 1925 Moscow held the world’s first state-sponsored chess tournament. The world champion Capablanca and his predecessor Lasker came to win it – but Efim Bogoljubov finished ahead of both.',
      'From 1948 to 1972 every world champion came from the Soviet Union: Botvinnik, Smyslov, Tal, Petrosian, Spassky – until Fischer won in Reykjavík.',
      'And in 1985, here in Moscow, Garry Kasparov beat Anatoly Karpov and became world champion at 22. He kept the title until 2000.',
    ],
    board: ['After 3.Nxe5 play ...d6 first – only then take on e4. Take at once, and 4.Qe2 can cost you the queen.', 'Your knight on e4 is strong. Back it up with ...d5.'],
  },
  reykjavik: {
    region: R.no,
    subtitle: 'The match the world watched',
    headline: 'A first move nobody expected',
    story: [
      'In 1972 the whole world was watching one match in Reykjavík: Fischer against Spassky.',
      'In game 6 Fischer surprised everyone with his very first move: 1.c4 instead of 1.e4.',
      'When that game ended, Spassky stood up and applauded him.',
    ],
  },
  newyork: {
    region: R.ny,
    subtitle: 'Champions and machines',
    headline: 'The day a computer won',
    story: [
      'In 1886 the first official world championship match started in New York.',
      'In 1912 the Spanish engineer Torres Quevedo built a machine that could mate a lone king with king and rook – every time.',
      'Here in New York in 1924, Richard Réti beat Capablanca with 1.Nf3 – the Réti Opening.',
      'And in 1997, in New York again, the computer Deep Blue beat the world champion Garry Kasparov.',
    ],
  },
  rio: {
    region: R.br,
    subtitle: 'A Brazilian master',
    headline: 'The bishop jump 2.Bg5',
    story: [
      'Octávio Trompowsky was born in Rio de Janeiro in 1897.',
      'After 1.d4 Nf6 he played 2.Bg5 at once. He played it in the 1930s and 1940s, so the opening got his name.',
      'In 1939 he became the chess champion of Brazil.',
    ],
    black: 'mirror-najdorf',
  },
  orbit: {
    region: R.sp,
    subtitle: 'Chess leaves the Earth',
    headline: 'When the rules change',
    story: [
      'On 9 June 1970 two cosmonauts on Soyuz 9 played chess against mission control on Earth – the first documented game in space.',
      'Their board had pegs, not magnets – magnets could disturb the spaceship.',
      'In 1996 Bobby Fischer presented Chess960: the back row is shuffled, so memorised openings don’t help.',
    ],
  },
  chennai: {
    region: R.in,
    subtitle: 'The game comes home',
    headline: 'The last challenge',
    story: [
      'The game began in India – and now it has come back.',
      'In 1988 Viswanathan Anand became India’s first grandmaster. In 2024 Gukesh from Chennai became world champion at 18.',
    ],
  },
}

export const chapterOf = (id: string): Chapter | undefined => BOOK[id]
