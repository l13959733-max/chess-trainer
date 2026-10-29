import { useEffect, useState } from 'react'
import { subscribe, type AnalyzerState } from '../lib/analyzer'

export function useAnalyzer(): AnalyzerState {
  const [s, setS] = useState<AnalyzerState>({ status: 'idle', total: 0, analyzed: 0, found: 0 })
  useEffect(() => subscribe(setS), [])
  return s
}
