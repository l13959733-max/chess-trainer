// Who uses this phone. No password and no server: every phone belongs to one person.
const NAME_KEY = 'chess-trainer-name'
export const MAX_NAME = 20

export function getName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY)
  } catch {
    return null
  }
}

export function setName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, cleanName(name))
  } catch {
    // private mode: asked again next time
  }
}

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME)
}
