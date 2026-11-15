import { flushSync } from 'react-dom'
import { backFromLine } from './returnTo'

// Lu, 15.11.: smooth changes in and out of the start page, like the city book (View Transitions): the big picture
// glides into the city's picture (and back), the rest fades, the bottom bar stays. Old browsers and reduced motion:
// the page just changes as before.
//
// bp-vt  – only during a transition: gives the pictures their shared name (king.css)
// bp-still / vt-still – the pages' own slide-in stays off while transitions run; otherwise it starts again at the end
//            of the transition and the page twitches ("Nachrutschen"). vt-still goes away at the next plain change.

type VTDoc = Document & { startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> } }

export function canGlide(): boolean {
  return !!(document as VTDoc).startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches
}

// going to the start page that at once sends you on (back from a line → where it was opened): no glide, it would
// fade into an empty page first
function homeSendsOn(): boolean {
  if (backFromLine()) return true
  try {
    return !!sessionStorage.getItem('hoppy-back-to-training')
  } catch {
    return false
  }
}

export function glide(apply: () => void, toHome: boolean) {
  const doc = document as VTDoc
  if (!canGlide() || (toHome && homeSendsOn())) return plain(apply)
  const html = document.documentElement
  html.classList.add('bp-vt', 'bp-still', 'vt-still')
  const hash = location.hash
  doc
    .startViewTransition(async () => {
      flushSync(apply)
      await ready(hash)
    })
    .finished.finally(() => html.classList.remove('bp-vt'))
}

export function plain(apply: () => void) {
  document.documentElement.classList.remove('vt-still')
  apply()
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// the new page is there (not its loading screen, not an empty redirect) and its big picture is decoded – at most 450 ms
async function ready(hash: string) {
  const end = performance.now() + 450
  const shown = () => {
    const main = document.querySelector('main.app')
    if (!main || main.querySelector('.loading')) return false
    return [...main.children].some((c) => c.tagName !== 'HEADER')
  }
  while (performance.now() < end && location.hash === hash && !shown()) await wait(16)
  const imgs = [...document.querySelectorAll<HTMLImageElement>('.book-art img, .bp-img img, .bp-hero img')].filter((i) => !i.complete)
  if (imgs.length) await Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => {}))), wait(Math.max(0, end - performance.now()))])
}
