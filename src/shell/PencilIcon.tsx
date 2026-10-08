/** The hand-drawn pencil that marks something as editable, in the UI's round-ended line. */
export function PencilIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M5 19l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L9 17.5zM13.5 7l3 3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
