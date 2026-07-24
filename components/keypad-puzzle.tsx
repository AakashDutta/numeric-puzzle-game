'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Colors
const NAVY = '#13277e'
const PINK = '#ff4d97'
const GREY = '#b9bec7'
const GREY_BORDER = '#8b919d'

// The starting arrangement, described column-by-column (left -> right, top -> bottom):
//   Column 1: 3, 6, 1
//   Column 2: 7, 2, 4
//   Column 3: 8, 5, (empty)
// Laid out as a row-major 3x3 grid, that becomes:
//   Row 1: 3, 7, 8
//   Row 2: 6, 2, 5
//   Row 3: 1, 4, 0   (0 = empty slot)
const INITIAL: number[] = [3, 7, 8, 6, 2, 5, 1, 4, 0]

// A "standard keypad" — numbers in order, empty slot last.
const SOLVED: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0]

const START_SECONDS = 10 * 60 // 10 minutes

// Text style shared by the funky labels
const funkyText: React.CSSProperties = {
  fontFamily: 'var(--font-fredoka), sans-serif',
  fontWeight: 700,
  fontStyle: 'italic',
  letterSpacing: '0.02em',
}

// Simple hand-drawn 2D look: white fill, colored border, and a THICKER
// bottom edge (plus a slightly thicker right edge) so it reads as drawn art
// rather than a rendered 3D bevel.
function flatBox(color: string): React.CSSProperties {
  return {
    background: '#ffffff',
    borderStyle: 'solid',
    borderColor: color,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    color,
  }
}

function isSolved(t: number[]): boolean {
  return t.every((v, i) => v === SOLVED[i])
}

export default function KeypadPuzzle() {
  const [tiles, setTiles] = useState<number[]>(INITIAL)
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(START_SECONDS)
  const [pressed, setPressed] = useState<number | null>(null)
  const [resetPressed, setResetPressed] = useState(false)
  const [won, setWon] = useState(false)

  // Stats
  const [completedToday, setCompletedToday] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer — stops at 0 or once solved.
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (won && intervalRef.current) clearInterval(intervalRef.current)
  }, [won])

  const handleTileClick = useCallback(
    (index: number) => {
      if (won) return
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
          if (isSolved(next)) {
            setWon(true)
            setCompletedToday(1)
            setCurrentStreak((c) => {
              const nc = c + 1
              setLongestStreak((l) => Math.max(l, nc))
              return nc
            })
          }
          return next
        })
      }

      // brief press animation
      setPressed(index)
      window.setTimeout(() => setPressed((p) => (p === index ? null : p)), 120)
    },
    [tiles, won],
  )

  const handleReset = useCallback(() => {
    setTiles(INITIAL)
    setMoves(0)
    setSeconds(START_SECONDS)
    setWon(false)
    setResetPressed(true)
    window.setTimeout(() => setResetPressed(false), 140)
  }, [])

  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  const timeLabel = `TIME : ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 32,
        flexWrap: 'wrap',
      }}
    >
      {/* ===== Left column: logo + newspaper panel ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: 320 }}>
        {/* Logo box */}
        <div
          style={{
            ...flatBox(PINK),
            borderRadius: 10,
            padding: '18px 16px',
            textAlign: 'center',
            fontSize: 30,
            ...funkyText,
            color: PINK,
          }}
        >
          SLIDING TOYS
        </div>

        {/* Newspaper article */}
        <div
          style={{
            ...flatBox(NAVY),
            borderRadius: 10,
            padding: '20px 18px',
            color: NAVY,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.15,
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontWeight: 700,
              color: NAVY,
            }}
          >
            DAILY 8 PUZZLE 24 JULY 2026
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.5,
              color: NAVY,
              fontFamily: 'var(--font-fredoka), sans-serif',
            }}
          >
            Get ready to tackle the 8-puzzle slide tiles to put the numbers in order, but be
            prepared for a challenge!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <StatLine label="Completed today" value={completedToday} />
            <StatLine label="Current streak" value={currentStreak} />
            <StatLine label="Longest streak" value={longestStreak} />
          </div>

          {won && (
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontStyle: 'italic',
                color: PINK,
                fontFamily: 'var(--font-fredoka), sans-serif',
              }}
            >
              SOLVED! Well done.
            </div>
          )}
        </div>
      </div>

      {/* ===== Center: keypad + controls ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {/* Keypad */}
        <div
          style={{
            padding: 18,
            background: '#ffffff',
            border: '2px solid #d7dae1',
            borderRadius: 10,
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
                      borderStyle: 'solid',
                      borderColor: GREY_BORDER,
                      borderTopWidth: 3,
                      borderLeftWidth: 3,
                      borderRightWidth: 5,
                      borderBottomWidth: 8,
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
                    ...flatBox(NAVY),
                    fontSize: 34,
                    ...funkyText,
                    color: NAVY,
                    transform: isDown ? 'translateY(2px)' : 'none',
                    transition: 'transform 80ms ease',
                  }}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>

        {/* Controls panel */}
        <div
          style={{
            padding: 16,
            background: '#ffffff',
            border: '2px solid #d7dae1',
            borderRadius: 10,
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
              ...flatBox(PINK),
              fontSize: 20,
              ...funkyText,
              color: PINK,
              transform: resetPressed ? 'translateY(2px)' : 'none',
              transition: 'transform 80ms ease',
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
              ...flatBox(NAVY),
              fontSize: 20,
              ...funkyText,
              color: NAVY,
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
              ...flatBox(NAVY),
              fontSize: 20,
              ...funkyText,
              color: NAVY,
            }}
          >
            {`MOVES: ${moves}`}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        fontSize: 18,
        fontWeight: 700,
        color: '#13277e',
        fontFamily: 'var(--font-fredoka), sans-serif',
      }}
    >
      <span>{label}</span>
      <span
        aria-hidden
        style={{ flex: 1, borderBottom: '2px dotted #13277e', margin: '0 6px', transform: 'translateY(-3px)' }}
      />
      <span>{value}</span>
    </div>
  )
}
