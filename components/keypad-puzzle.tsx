'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Colors
const NAVY = '#13277e'
const NAVY_LIGHT = '#3a55c9'
const NAVY_DARK = '#0a1550'
const PINK = '#ff4d97'
const PINK_LIGHT = '#ff86bd'
const PINK_DARK = '#c21868'
const GREY = '#b9bec7'

// The starting arrangement, described column-by-column (left -> right, top -> bottom):
//   Column 1: 3, 6, 1
//   Column 2: 7, 2, 4
//   Column 3: 8, 5, (empty)
// Laid out as a row-major 3x3 grid, that becomes:
//   Row 1: 3, 7, 8
//   Row 2: 6, 2, 5
//   Row 3: 1, 4, 0   (0 = empty slot)
const INITIAL: number[] = [3, 7, 8, 6, 2, 5, 1, 4, 0]

const START_SECONDS = 10 * 60 // 10 minutes

// Text style shared by the "3D" funky labels
const funkyText: React.CSSProperties = {
  fontFamily: 'var(--font-fredoka), sans-serif',
  fontWeight: 700,
  fontStyle: 'italic',
  letterSpacing: '0.02em',
}

// Build a chunky 2D "3D-effect" bevel using layered box shadows.
function bevel(light: string, dark: string, deep: string): string {
  return [
    `inset 3px 3px 0 ${light}`,
    `inset -3px -3px 0 ${dark}`,
    `4px 4px 0 ${deep}`,
    `6px 6px 0 rgba(0,0,0,0.18)`,
  ].join(', ')
}

function bevelPressed(light: string, dark: string, deep: string): string {
  return [
    `inset -2px -2px 0 ${light}`,
    `inset 2px 2px 0 ${dark}`,
    `1px 1px 0 ${deep}`,
  ].join(', ')
}

export default function KeypadPuzzle() {
  const [tiles, setTiles] = useState<number[]>(INITIAL)
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(START_SECONDS)
  const [pressed, setPressed] = useState<number | null>(null)
  const [resetPressed, setResetPressed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleTileClick = useCallback(
    (index: number) => {
      const value = tiles[index]
      if (value === 0) return // clicking the empty slot does nothing

      const emptyIndex = tiles.indexOf(0)
      const row = Math.floor(index / 3)
      const col = index % 3
      const emptyRow = Math.floor(emptyIndex / 3)
      const emptyCol = emptyIndex % 3
      const isAdjacent =
        (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
        (col === emptyCol && Math.abs(row - emptyRow) === 1)

      // Every tap on a number counts as a move.
      setMoves((m) => m + 1)

      if (isAdjacent) {
        setTiles((prev) => {
          const next = [...prev]
          next[emptyIndex] = value
          next[index] = 0
          return next
        })
      }

      // brief press animation
      setPressed(index)
      window.setTimeout(() => setPressed((p) => (p === index ? null : p)), 120)
    },
    [tiles],
  )

  const handleReset = useCallback(() => {
    setTiles(INITIAL)
    setMoves(0)
    setSeconds(START_SECONDS)
    setResetPressed(true)
    window.setTimeout(() => setResetPressed(false), 140)
  }, [])

  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  const timeLabel = `TIME : ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      {/* ===== Keypad ===== */}
      <div
        style={{
          padding: 18,
          background: '#ffffff',
          border: '2px solid #d7dae1',
          borderRadius: 10,
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 84px)',
            gridTemplateRows: 'repeat(3, 84px)',
            gap: 14,
          }}
        >
          {tiles.map((value, index) => {
            if (value === 0) {
              // empty grey 2D box
              return (
                <div
                  key={`empty-${index}`}
                  aria-label="empty slot"
                  style={{
                    background: GREY,
                    borderRadius: 10,
                    border: `4px solid #9aa0ab`,
                    boxShadow: 'inset 3px 3px 0 #cdd2da, inset -3px -3px 0 #8b919d',
                  }}
                />
              )
            }
            const isDown = pressed === index
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTileClick(index)}
                aria-label={`Number ${value}`}
                style={{
                  cursor: 'pointer',
                  borderRadius: 10,
                  border: `4px solid ${NAVY}`,
                  background: NAVY,
                  color: '#ffffff',
                  fontSize: 34,
                  ...funkyText,
                  boxShadow: isDown
                    ? bevelPressed(NAVY_LIGHT, NAVY_DARK, NAVY_DARK)
                    : bevel(NAVY_LIGHT, NAVY_DARK, NAVY_DARK),
                  transform: isDown ? 'translate(3px, 3px)' : 'none',
                  transition: 'transform 80ms ease, box-shadow 80ms ease',
                  textShadow: '2px 2px 0 rgba(0,0,0,0.35)',
                }}
              >
                {value}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== Controls panel ===== */}
      <div
        style={{
          padding: 16,
          background: '#ffffff',
          border: '2px solid #d7dae1',
          borderRadius: 10,
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          display: 'flex',
          gap: 14,
          alignItems: 'stretch',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {/* RESET */}
        <button
          type="button"
          onClick={handleReset}
          style={{
            cursor: 'pointer',
            padding: '0 22px',
            height: 56,
            borderRadius: 10,
            border: `4px solid ${PINK}`,
            background: PINK,
            color: '#ffffff',
            fontSize: 20,
            ...funkyText,
            boxShadow: resetPressed
              ? bevelPressed(PINK_LIGHT, PINK_DARK, PINK_DARK)
              : bevel(PINK_LIGHT, PINK_DARK, PINK_DARK),
            transform: resetPressed ? 'translate(3px, 3px)' : 'none',
            transition: 'transform 80ms ease, box-shadow 80ms ease',
            textShadow: '2px 2px 0 rgba(0,0,0,0.3)',
          }}
        >
          RESET
        </button>

        {/* TIME (display only) */}
        <div
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 22px',
            height: 56,
            minWidth: 190,
            borderRadius: 10,
            border: `4px solid ${NAVY}`,
            background: NAVY,
            color: '#ffffff',
            fontSize: 20,
            ...funkyText,
            boxShadow: bevel(NAVY_LIGHT, NAVY_DARK, NAVY_DARK),
            textShadow: '2px 2px 0 rgba(0,0,0,0.35)',
          }}
        >
          {timeLabel}
        </div>

        {/* MOVES (display only) */}
        <div
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 22px',
            height: 56,
            minWidth: 130,
            borderRadius: 10,
            border: `4px solid ${NAVY}`,
            background: NAVY,
            color: '#ffffff',
            fontSize: 20,
            ...funkyText,
            boxShadow: bevel(NAVY_LIGHT, NAVY_DARK, NAVY_DARK),
            textShadow: '2px 2px 0 rgba(0,0,0,0.35)',
          }}
        >
          {`MOVES: ${moves}`}
        </div>
      </div>
    </div>
  )
}
