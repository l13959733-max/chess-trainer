import { expect, it } from 'vitest'
import { piecesInDanger } from './safety'

it('finds undefended attacked pieces and pieces attacked by cheaper ones', () => {
  // White knight on e5 attacked by the d6 pawn (cheaper) and the e4 pawn hanging to the queen on h4;
  // black queen h4 attacked by the g3 pawn
  const fen = 'rnb1kbnr/ppp2ppp/3p4/4N3/2B1P2q/6P1/PPPP1P1P/RNBQK2R w KQkq - 0 5'
  expect(piecesInDanger(fen, 'w')).toEqual(['e5', 'e4'])
  expect(piecesInDanger(fen, 'b')).toEqual(['h4'])
})

it('a protected piece attacked by an equal piece is fine', () => {
  // Knights on d4 (white, protected by e3) and c6 (black, protected by b7) attack each other
  const fen = '4k3/1p6/2n5/8/3N4/4P3/8/4K3 w - - 0 1'
  expect(piecesInDanger(fen, 'w')).toEqual([])
  expect(piecesInDanger(fen, 'b')).toEqual([])
})
