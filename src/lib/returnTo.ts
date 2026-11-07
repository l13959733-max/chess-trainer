// The line opened last (learn, drill, play on), so the overview can show it again; other screens forget it
let returnTo: string | null = null
// The page the line was opened from (the opening path or a station on the world map)
let origin: string | null = null

export function rememberLine(id: string | null) {
  returnTo = id
}

export function lastLine(): string | null {
  return returnTo
}

export function rememberOrigin(route: string) {
  origin = route
}

// Coming back from a line to the start page: go back to where the line was opened instead
export function backFromLine(): string | null {
  return returnTo && origin ? origin : null
}

// A line opened from a station on the world map: "Continue" leads on through that station
export function stationOrigin(): string | null {
  return origin?.startsWith('king/') ? origin : null
}
