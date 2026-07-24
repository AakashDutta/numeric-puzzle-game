import KeypadPuzzle from '@/components/keypad-puzzle'

export default function Page() {
  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: '#ffffff',
        padding: '120px 24px 48px',
      }}
    >
      <KeypadPuzzle />
    </main>
  )
}
