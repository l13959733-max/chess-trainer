import { useMemo, useState } from 'react'
import { go } from '../hooks/useHashRoute'
import type { Repertoire } from '../hooks/useRepertoire'
import { parsePgn, type Side } from '../lib/pgn'

export function Import({ rep }: { rep: Repertoire }) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [side, setSide] = useState<Side>('w')
  const [saved, setSaved] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const preview = useMemo(() => (text.trim() ? parsePgn(text, side) : null), [text, side])

  async function onFile(file: File | undefined) {
    if (!file) return
    setText(await file.text())
    setName(file.name.replace(/\.(pgn|txt)$/i, ''))
    setSaved(null)
  }

  async function save() {
    if (!preview?.lines.length) return
    await rep.addImport({ name: name.trim() || preview.lines[0].title, pgn: text, side, addedAt: Date.now() })
    setSaved(`Saved ${preview.lines.length} ${preview.lines.length === 1 ? 'line' : 'lines'}.`)
    setText('')
    setName('')
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="back" onClick={() => go('')} aria-label="Back to overview">←</button>
        <div>
          <div className="eyebrow">Repertoire</div>
          <h2>Import PGN</h2>
        </div>
      </div>

      <div className="form">
        <label className="file">
          <span>Choose a PGN file</span>
          <input id="pgn-file" type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>

        <label htmlFor="pgn-text">… or paste it here</label>
        <textarea
          id="pgn-text"
          rows={8}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSaved(null)
          }}
          placeholder={'[Event "Caro-Kann: Advance Variation"]\n[Side "Black"]\n\n1. e4 c6 {Prepares d5.} 2. d4 d5 3. e5 Bf5 *'}
          spellCheck={false}
        />

        <label htmlFor="pgn-name">Name (optional)</label>
        <input id="pgn-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Caro-Kann" />

        <fieldset className="seg">
          <legend>My side, if the PGN has no [Side] header</legend>
          <label className={side === 'w' ? 'on' : ''}>
            <input id="side-w" type="radio" name="side" checked={side === 'w'} onChange={() => setSide('w')} /> White
          </label>
          <label className={side === 'b' ? 'on' : ''}>
            <input id="side-b" type="radio" name="side" checked={side === 'b'} onChange={() => setSide('b')} /> Black
          </label>
        </fieldset>

        {preview && (
          <div className={`preview ${preview.errors.length ? 'has-errors' : ''}`}>
            <div>
              {preview.lines.length} {preview.lines.length === 1 ? 'line' : 'lines'} found
            </div>
            {preview.lines.length > 0 && (
              <ul>
                {preview.lines.map((l) => (
                  <li key={l.id}>
                    {l.title} · {l.side === 'w' ? 'White' : 'Black'} · {l.moves.length} plies
                  </li>
                ))}
              </ul>
            )}
            {preview.errors.map((e) => (
              <p key={e} className="bad">Could not read – {e}</p>
            ))}
          </div>
        )}

        <button type="button" className="primary wide" disabled={!preview?.lines.length} onClick={save}>
          Import
        </button>
        {saved && <p className="good" role="status">{saved}</p>}
      </div>

      {rep.imports.length > 0 && (
        <section className="lines">
          <h2>Imported so far</h2>
          {rep.imports.map((imp) => (
            <article key={imp.id} className="line-card">
              <div className="line-info">
                <h3>{imp.name}</h3>
                <div className="meta">
                  <span>{parsePgn(imp.pgn, imp.side).lines.length} lines</span>
                  <span>{new Date(imp.addedAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
              <div className="line-actions">
                {confirmId === imp.id ? (
                  <>
                    <button type="button" onClick={() => setConfirmId(null)}>Cancel</button>
                    <button type="button" className="danger" onClick={() => rep.removeImport(imp.id!)}>Delete</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmId(imp.id!)}>Remove</button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
