import { useEffect, useState } from 'react'
import { glide, plain } from '../lib/pageMotion'

// Hash routes so GitHub Pages works without server rewrites: #/learn/<id>, #/drill/<id> …
export function useHashRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [route, setRoute] = useState(read)
  useEffect(() => {
    let page = read()[0] ?? ''
    const onChange = () => {
      const next = read()
      const from = page
      page = next[0] ?? ''
      const apply = () => {
        setRoute(next)
        window.scrollTo(0, 0)
      }
      // Lu, 15.11.: in and out of the start page the pages glide (src/lib/pageMotion.ts); everything else as before
      if (from !== page && (from === '' || page === '')) glide(apply, page === '')
      else plain(apply)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(path: string) {
  window.location.hash = '/' + path
}
