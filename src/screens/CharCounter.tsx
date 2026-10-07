import '../shell/controls.css'

export interface CharCounterProps {
  value: string
  max: number
}

/** "12/40" beside a name field. Screen readers only hear it when the last few characters are left. */
export function CharCounter({ value, max }: CharCounterProps) {
  const left = Math.max(0, max - [...value].length)
  const low = left <= 5
  return (
    <>
      <span className={low ? 'char-count char-count-low' : 'char-count'} aria-hidden="true">
        {[...value].length}/{max}
      </span>
      <span className="sr-only" role="status">
        {low ? `${left} ${left === 1 ? 'character' : 'characters'} left` : ''}
      </span>
    </>
  )
}
