import { describe, expect, it } from 'vitest'
import { pickVoice } from './voicePick'

const v = (name: string, lang = 'en-US') => ({ name, lang })

describe('pickVoice', () => {
  it('never picks novelty voices, even when they come first', () => {
    expect(pickVoice([v('Albert'), v('Bubbles'), v('Zarvox'), v('Samantha')])?.name).toBe('Samantha')
  })
  it('prefers premium and enhanced voices', () => {
    expect(pickVoice([v('Samantha'), v('Ava (Premium)'), v('Ava (Enhanced)')])?.name).toBe('Ava (Premium)')
    expect(pickVoice([v('Samantha'), v('Karen (Enhanced)', 'en-AU')])?.name).toBe('Karen (Enhanced)')
  })
  it('only picks English voices', () => {
    expect(pickVoice([v('Anna', 'de-DE'), v('Daniel', 'en-GB')])?.name).toBe('Daniel')
    expect(pickVoice([v('Anna', 'de-DE')])).toBeUndefined()
  })
  it('takes any normal English voice when no known one exists', () => {
    expect(pickVoice([v('Albert'), v('Moira', 'en-IE')])?.name).toBe('Moira')
  })
})

import { isAllowedVoiceUrl } from './voice'
describe('voice link', () => {
  it('accepts only tunnel addresses and the local Mac', () => {
    expect(isAllowedVoiceUrl('https://able-bird-1234.trycloudflare.com')).toBe(true)
    expect(isAllowedVoiceUrl('http://localhost:8090')).toBe(true)
    expect(isAllowedVoiceUrl('http://able-bird.trycloudflare.com')).toBe(false)
    expect(isAllowedVoiceUrl('https://evil.example.com')).toBe(false)
    expect(isAllowedVoiceUrl('https://trycloudflare.com.evil.com')).toBe(false)
    expect(isAllowedVoiceUrl('javascript:alert(1)')).toBe(false)
  })
})
