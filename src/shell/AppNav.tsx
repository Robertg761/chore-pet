import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Sheet } from './Sheet'
import './AppNav.css'

export type Tab = 'home' | 'build' | 'wardrobe' | 'rewards' | 'more'

/** Which hand-drawn icon leads a More item. Items without one are just text. */
export type MoreIcon = 'chores' | 'week' | 'look' | 'share' | 'vacation' | 'settings' | 'install'

export interface MoreItem {
  label: string
  icon?: MoreIcon
  onSelect: () => void
}

export interface AppNavProps {
  active: Tab
  onNavigate: (tab: Exclude<Tab, 'more'>) => void
  /** Short note under Rewards, e.g. "Gift in 2". */
  rewardsNote?: string
  /** The note in full for screen readers and hover, e.g. "2 more chores to the teddy bear". */
  rewardsHint?: string
  more: MoreItem[]
  /** A quiet line at the foot of the More menu, e.g. the sync status. */
  note?: string
  menuOpen?: boolean
  onMenuChange?: (open: boolean) => void
}

// Hand-drawn 24px icons in the same round-ended line as the rest of the UI.
const ICONS: Record<Tab, ReactNode> = {
  home: <path d="M4 11.5L12 4.5l8 7M6.5 9.5V19.5h11V9.5M10 19.5v-5h4v5" />,
  build: (
    <>
      <path d="M4 20h16M6 20v-6h5v6M13 20V9h5v11" />
      <path d="M13 9l2.5-4.5L18 9" />
    </>
  ),
  wardrobe: (
    <>
      <path d="M12 7.5a2 2 0 1 1 2-2" />
      <path d="M12 7.5v1.2L3.8 15a1.4 1.4 0 0 0 .9 2.5h14.6a1.4 1.4 0 0 0 .9-2.5L12 8.7" />
    </>
  ),
  rewards: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6 1 6-1.5S14 5 12 9" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
}

// The More menu's icons: same 24px grid, round line and 2.2 weight as the tab bar's.
const MORE_ICONS: Record<MoreIcon, ReactNode> = {
  chores: (
    <>
      <path d="M3.5 6.2l1.8 1.8 3.2-3.6M3.5 12.7l1.8 1.8 3.2-3.6M4 19.5h4.5" />
      <path d="M12.5 6.5h8M12.5 12.5h8M12.5 19.5h8" />
    </>
  ),
  week: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10.5h16M8.5 3.5v3.5M15.5 3.5v3.5M8.5 15h.01M12 15h.01M15.5 15h.01" />
    </>
  ),
  look: (
    <>
      <path d="M20 4.5c-4.6 0-8 2.7-9.2 7l2.7 2.7c4.3-1.2 7-4.6 6.5-9.7z" />
      <path d="M10.8 11.5L8.4 13.9M8.6 14.6c-2.2-.2-3.8 1.3-3.8 3.3 0 .8-.5 1.5-1.2 2 3.3.6 6.4-.4 6.6-3.1" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M8 7.5L12 4l4 3.5" />
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
    </>
  ),
  vacation: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
    </>
  ),
  settings: (
    <>
      <path d="M10.2 5.7L10.4 3.2h3.2l.2 2.5 1.4.5 1.9-1.6 2.3 2.3-1.6 1.9.5 1.4 2.5.2v3.2l-2.5.2-.5 1.4 1.6 1.9-2.3 2.3-1.9-1.6-1.4.5-.2 2.5h-3.2l-.2-2.5-1.4-.5-1.9 1.6-2.3-2.3 1.6-1.9-.5-1.4-2.5-.2v-3.2l2.5-.2.5-1.4-1.6-1.9 2.3-2.3 1.9 1.6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  install: (
    <>
      <path d="M4 11.5L12 4.5l8 7M6.5 9.5V19.5h11V9.5" />
      <path d="M12 12.5V17M9.8 14.8h4.4" />
    </>
  ),
}

const LABELS: Record<Tab, string> = { home: 'Home', build: 'Build', wardrobe: 'Wardrobe', rewards: 'Rewards', more: 'More' }
const TABS: Tab[] = ['home', 'build', 'wardrobe', 'rewards', 'more']

/** The app's tabs: a bar along the bottom on phones, a rail down the left on wide screens. */
/**
 * The soft pill behind the current tab's icon. It glides from tab to tab rather
 * than jumping, and follows the layout (bar or rail) as the window changes.
 */
/** Where the pill last sat, kept across screens: some screens draw a fresh tab bar, and the pill should glide on from there. */
let lastPill: { x: number; y: number; width: number; height: number } | null = null

function useTabPill(active: Tab) {
  const track = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const box = track.current
    const shape = pill.current
    if (!box || !shape) return
    const set = (at: NonNullable<typeof lastPill>) => {
      shape.style.width = `${at.width}px`
      shape.style.height = `${at.height}px`
      shape.style.translate = `${at.x}px ${at.y}px`
    }
    const place = (animate: boolean) => {
      const icon = box.querySelector<SVGElement>('.app-nav-tab[aria-current="page"] svg')
      if (!icon) {
        shape.style.opacity = '0'
        return
      }
      const from = box.getBoundingClientRect()
      const at = icon.getBoundingClientRect()
      const next = { x: at.left - from.left, y: at.top - from.top, width: at.width, height: at.height }
      // Start from where it was (this bar or the last one), with no glide, then glide to the current tab.
      shape.style.transition = 'none'
      set(animate && lastPill ? lastPill : next)
      shape.style.opacity = '1'
      void shape.offsetWidth
      shape.style.transition = ''
      set(next)
      lastPill = next
    }
    place(true)
    // Only real size changes after this (a ResizeObserver also reports once on attach, mid-glide).
    let first = true
    const observer = new ResizeObserver(() => (first ? (first = false) : place(false)))
    observer.observe(box)
    return () => observer.disconnect()
  }, [active])
  return { track, pill }
}

export function AppNav({ active, onNavigate, rewardsNote, rewardsHint, more, note, menuOpen, onMenuChange }: AppNavProps) {
  const [localMenu, setLocalMenu] = useState(false)
  const menu = menuOpen ?? localMenu
  const setMenu = onMenuChange ?? setLocalMenu
  const { track, pill } = useTabPill(active)

  return (
    <nav className="app-nav" aria-label="Main">
      <div ref={track} className="app-nav-track">
      <span ref={pill} className="app-nav-pill" aria-hidden="true" />
      <ul className="app-nav-list">
        {TABS.map((tab) => {
          // The short "Gift in 2" under Rewards, said in full to screen readers and on hover. The visible
          // words lead, so voice control can still pick the tab by what it shows.
          const hint = tab === 'rewards' && rewardsNote && rewardsHint ? `${LABELS[tab]}, ${rewardsNote}: ${rewardsHint}` : undefined
          return (
            <li key={tab}>
              <button
                type="button"
                className="app-nav-tab"
                title={hint ?? LABELS[tab]}
                aria-label={hint}
                aria-current={tab === active ? 'page' : undefined}
                aria-haspopup={tab === 'more' ? 'dialog' : undefined}
                onClick={() => (tab === 'more' ? setMenu(true) : onNavigate(tab))}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
                  <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[tab]}
                  </g>
                </svg>
                <span className="app-nav-label">{LABELS[tab]}</span>
                {tab === 'rewards' && rewardsNote && <span className="app-nav-note">{rewardsNote}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      </div>
      {menu && (
        <Sheet title="More" variant="menu" onClose={() => setMenu(false)}>
          <ul className="app-more">
            {more.map((item) => (
              <li key={item.label}>
                <button type="button" className="app-more-item" onClick={() => { if (!onMenuChange) setLocalMenu(false); item.onSelect() }}>
                  {item.icon && (
                    <svg className="app-more-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        {MORE_ICONS[item.icon]}
                      </g>
                    </svg>
                  )}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {note && <p className="app-more-note">{note}</p>}
        </Sheet>
      )}
    </nav>
  )
}
