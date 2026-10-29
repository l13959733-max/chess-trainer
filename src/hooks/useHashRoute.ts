import { useEffect, useState } from 'react'

// Hash routes so GitHub Pages works without server rewrites: #/learn/<id>, #/drill/<id> …
export function useHashRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(path: string) {
  window.location.hash = '/' + path
}
