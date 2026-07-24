'use client'

import { useCallback, useEffect, useState } from 'react'

// Colors
const NAVY = '#13277e'
const PINK = '#ff4d97'
const GREY = '#b9bec7'
const GREY_BORDER = '#8b919d'
// Correct-position highlight (light blue)
const CORRECT_COLOR = '#4a90d9'
const CORRECT_BG = '#e4f0fc'

const START_SECONDS = 10 * 60 // 10 minutes

// A fixed, solvable 3x3 board used for the very first server + client paint.
// Rendering the same board on both sides avoids a hydration mismatch; the
// board is then re-scrambled on the client after mount for a random game.
const INITIAL_3x3: number[] = [0, 1, 3, 4, 2, 5, 7, 8, 6]

// Text style shared by the funky labels
const funkyText: React.CSSProperties = {
  fontFamily: 'var(--font-fredoka), sans-serif',
  fontWeight: 700,
  fontStyle: 'italic',
  letterSpacing: '0.02em',
}

// Simple hand-drawn 2D look: white fill, colored border, and a THICKER
// bottom edge (plus a slightly thicker right edge) so it reads as drawn art.
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

// The solved layout for a given size: 1..n-1 then the empty slot.
function makeSolved(size: number): number[] {
  const n = size * size
  const arr = Array.from({ length: n - 1 }, (_, i) => i + 1)
  arr.push(0)
  return arr
}

function isSolved(tiles: number[], size: number): boolean {
  const solved = makeSolved(size)
  return tiles.every((v, i) => v === solved[i])
}

// Scramble by making many random *legal* moves from the solved state, which
// guarantees the puzzle is always solvable.
function scramble(size: number): number[] {
  const arr = makeSolved(size)
  let empty = arr.length - 1
  const count = size * size * 60
  let last = -1
  for (let i = 0; i < count; i++) {
    const r = Math.floor(empty / size)
    const c = empty % size
    const neighbors: number[] = []
    if (r > 0) neighbors.push(empty - size)
    if (r < size - 1) neighbors.push(empty + size)
    if (c > 0) neighbors.push(empty - 1)
    if (c < size - 1) neighbors.push(empty + 1)
    // avoid immediately undoing the previous move
    const options = neighbors.filter((n) => n !== last)
    const pick = options[Math.floor(Math.random() * options.length)]
    last = empty
    arr[empty] = arr[pick]
    arr[pick] = 0
    empty = pick
  }
  if (isSolved(arr, size)) return scramble(size)
  return arr
}

export default function KeypadPuzzle() {
  const [size, setSize] = useState(3)
  const [tiles, setTiles] = useState<number[]>(INITIAL_3x3)
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(START_SECONDS)
  const [pressed, setPressed] = useState<number | null>(null)
  const [resetPressed, setResetPressed] = useState(false)
  const [won, setWon] = useState(false)

  // Stats
  const [completedToday, setCompletedToday] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  const level = size - 2 // 3x3 = level 1, 4x4 = level 2, ...
  const solved = makeSolved(size)

  // Scramble once on the client after mount (keeps SSR/CSR markup identical).
  useEffect(() => {
    setTiles(scramble(3))
  }, [])

  // Countdown timer — runs while the round is active, pauses on win.
  useEffect(() => {
    if (won) return
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [won])

  const registerWin = useCallback(() => {
    setWon(true)
    // Increment grows with the level.
    setCompletedToday((c) => c + level)
    setCurrentStreak((c) => {
      const nc = c + 1
      setLongestStreak((l) => Math.max(l, nc))
      return nc
    })
  }, [level])

  const handleTileClick = useCallback(
    (index: number) => {
      if (won) return
      const value = tiles[index]
      if (value === 0) return

      const emptyIndex = tiles.indexOf(0)
      const row = Math.floor(index / size)
      const col = index % size
      const emptyRow = Math.floor(emptyIndex / size)
      const emptyCol = emptyIndex % size
      const isAdjacent =
        (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
        (col === emptyCol && Math.abs(row - emptyRow) === 1)

      setMoves((m) => m + 1)

      if (isAdjacent) {
        setTiles((prev) => {
          const next = [...prev]
          next[emptyIndex] = value
          next[index] = 0
          if (isSolved(next, size)) registerWin()
          return next
        })
      }

      setPressed(index)
      window.setTimeout(() => setPressed((p) => (p === index ? null : p)), 120)
    },
    [tiles, won, size, registerWin],
  )

  const handleReset = useCallback(() => {
    setTiles(scramble(size))
    setMoves(0)
    setSeconds(START_SECONDS)
    setWon(false)
    setResetPressed(true)
    window.setTimeout(() => setResetPressed(false), 140)
  }, [size])

  // Stay at the same size: fresh scramble, moves reset, keep playing.
  const handleStay = useCallback(() => {
    setTiles(scramble(size))
    setMoves(0)
    setSeconds(START_SECONDS)
    setWon(false)
  }, [size])

  // Level up: grow the board by one row + one column.
  const handleGoBigger = useCallback(() => {
    const next = size + 1
    setSize(next)
    setTiles(scramble(next))
    setMoves(0)
    setSeconds(START_SECONDS)
    setWon(false)
  }, [size])

  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  const timeLabel = `TIME : ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`

  // Board sizing scales down as the grid grows so it always fits nicely.
  const tilePx = Math.round(Math.max(46, 270 / size))
  const gap = size <= 3 ? 14 : size <= 4 ? 11 : 8
  const fontSize = Math.round(tilePx * 0.42)
  const puzzleCount = size * size - 1

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      {/* keyframes for the win popup zoom-in */}
      <style>{`@keyframes winPop{0%{opacity:0;transform:scale(0.35)}60%{opacity:1}100%{opacity:1;transform:scale(1)}}`}</style>

      {/* ===== Left column: logo + newspaper panel (pinned to far-left corner) ===== */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          width: 300,
        }}
      >
        {/* Logo box */}
        <div
          style={{
            ...flatBox(PINK),
            borderRadius: 10,
            padding: '20px 16px',
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
            padding: '26px 20px',
            color: NAVY,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 27,
              lineHeight: 1.4,
              letterSpacing: '0.01em',
              fontFamily: 'var(--font-fredoka), sans-serif',
              fontWeight: 700,
              color: NAVY,
            }}
          >
            DAILY {puzzleCount} PUZZLE 24 JULY 2026
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.9,
              color: NAVY,
              fontFamily: 'var(--font-fredoka), sans-serif',
            }}
          >
            Slide the tiles to put the numbers in order. Each win makes the board bigger.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StatLine label="Completed today" value={completedToday} />
            <StatLine label="Current streak" value={currentStreak} />
            <StatLine label="Longest streak" value={longestStreak} />
          </div>
        </div>
      </div>

      {/* ===== Center: keypad + controls ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {/* Keypad (relative so the win popup can overlay it) */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              padding: 18,
              background: '#ffffff',
              border: '2px solid #d7dae1',
              borderRadius: 10,
              transform: won ? 'scale(0.9)' : 'scale(1)',
              transition: 'transform 400ms ease',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${size}, ${tilePx}px)`,
                gridTemplateRows: `repeat(${size}, ${tilePx}px)`,
                gap,
              }}
            >
              {tiles.map((value, index) => {
                if (value === 0) {
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
                const inPlace = value === solved[index]
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleTileClick(index)}
                    aria-label={`Number ${value}${inPlace ? ' in place' : ''}`}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 10,
                      ...flatBox(inPlace ? CORRECT_COLOR : NAVY),
                      background: inPlace ? CORRECT_BG : '#ffffff',
                      color: inPlace ? CORRECT_COLOR : NAVY,
                      fontSize,
                      ...funkyText,
                      transform: isDown ? 'translateY(2px)' : 'none',
                      transition:
                        'transform 80ms ease, background-color 300ms ease, border-color 300ms ease, color 300ms ease',
                    }}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ===== Win popup ===== */}
          {won && (
            <div
              role="dialog"
              aria-label="You win"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                borderRadius: 10,
                background: 'rgba(255, 77, 151, 0.55)',
                backdropFilter: 'blur(1px)',
                animation: 'winPop 420ms ease-out',
              }}
            >
              <div
                style={{
                  ...funkyText,
                  fontSize: 40,
                  color: '#ffffff',
                  textShadow: '0 2px 0 rgba(0,0,0,0.15)',
                  textAlign: 'center',
                }}
              >
                YOU WIN! 🎉🥳
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <button
                  type="button"
                  onClick={handleStay}
                  style={{
                    cursor: 'pointer',
                    padding: '0 22px',
                    height: 52,
                    borderRadius: 10,
                    ...flatBox(PINK),
                    fontSize: 20,
                    ...funkyText,
                    color: PINK,
                  }}
                >
                  STAY
                </button>
                <button
                  type="button"
                  onClick={handleGoBigger}
                  style={{
                    cursor: 'pointer',
                    padding: '0 22px',
                    height: 52,
                    borderRadius: 10,
                    ...flatBox(PINK),
                    fontSize: 20,
                    ...funkyText,
                    color: PINK,
                  }}
                >
                  GO BIGGER!
                </button>
              </div>
            </div>
          )}
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
        fontSize: 19,
        lineHeight: 1.6,
        fontWeight: 700,
        color: NAVY,
        fontFamily: 'var(--font-fredoka), sans-serif',
      }}
    >
      <span>{label}</span>
      <span
        aria-hidden
        style={{
          flex: 1,
          borderBottom: '2px dotted #13277e',
          margin: '0 6px',
          transform: 'translateY(-3px)',
        }}
      />
      <span>{value}</span>
    </div>
  )
}
