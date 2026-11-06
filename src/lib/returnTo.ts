// The line opened last (learn, drill, play on), so the overview can show it again; other screens forget it
let returnTo: string | null = null

export function rememberLine(id: string | null) {
  returnTo = id
}

export function lastLine(): string | null {
  return returnTo
}
