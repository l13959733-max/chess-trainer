import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The same real positions as explain.test.ts, on a phone set to Spanish: the sentences must be
// Spanish, with Spanish move letters (C = caballo, A = alfil …) and the right articles.
const TOM = 'r2qk2r/ppp2pp1/2nbpn1p/3pN3/3P1B2/P1NPP3/1P3PPP/R2QR1K1 b kq - 3 11'
let ex: typeof import('./explain')
let coach: typeof import('./coach')

beforeAll(async () => {
  vi.stubGlobal('navigator', { language: 'es-ES' })
  vi.resetModules()
  ex = await import('./explain')
  coach = await import('./coach')
})
afterAll(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('explanations in Spanish', () => {
  it('pawn fork after Cxe5', () => {
    const text = ex.explainMistake(TOM, 'Nxe5', { score: { cp: 542 }, pv: ['d4e5', 'd6e7', 'e5f6', 'e7f6', 'd3d4', 'c7c6'] }).sentences.join(' ')
    expect(text).toContain('Las blancas responden dxe5 y te capturan el caballo de e5')
    expect(text).toContain('tu alfil de d6 y tu caballo de f6 a la vez: un ataque doble')
    expect(text).toContain('2 peones menos')
    expect(text).not.toMatch(/[{}]/)
  })
  it('forced mate, with Spanish letters', () => {
    const e = ex.explainMistake('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', 'Nf6', { score: { mate: 1 }, pv: ['h5f7'] })
    expect(e.sentences[0]).toBe('Después de Cf6, las blancas pueden forzar el mate en 1: Dxf7#.')
  })
  it('a lost queen: feminine article and ending', () => {
    const e = ex.explainMistake('r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 4 4', 'Qg4', { score: { cp: 900 }, pv: ['f6g4'] })
    expect(e.sentences[0]).toBe('Las negras responden Cxg4 y te capturan la dama de g4: después de tu jugada ya no estaba protegida.')
  })
  it('a pin', () => {
    const e = ex.explainMistake('r1bqkbnr/ppp2ppp/2np4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', 'Nc3', { score: { cp: 0 }, pv: ['c8g4'] })
    expect(e.sentences.join(' ')).toContain('Clava tu caballo de f3: si se mueve, pierdes tu dama de d1.')
  })
  it('coach reasons', () => {
    expect(coach.reason('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'g1f3')).toBe('desarrolla tu caballo a una buena casilla.')
    expect(coach.reason('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4')).toBe('gana espacio en el centro.')
  })
})
