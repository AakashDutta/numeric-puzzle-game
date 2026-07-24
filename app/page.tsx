import KeypadPuzzle from '@/components/keypad-puzzle'

export default function Page() {
  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        padding: 24,
      }}
    >
      <KeypadPuzzle />
    </main>
  )
}
