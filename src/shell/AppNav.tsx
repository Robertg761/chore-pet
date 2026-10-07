import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Sheet } from './Sheet'
import './AppNav.css'

export type Tab = 'home' | 'build' | 'wardrobe' | 'rewards' | 'more'

export interface MoreItem {
  label: string
  onSelect: () => void
}

export interface AppNavProps {
  active: Tab
  onNavigate: (tab: Exclude<Tab, 'more'>) => void
  /** Short note under Rewards, e.g. "2 to go". */
  rewardsNote?: string
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

export function AppNav({ active, onNavigate, rewardsNote, more, note, menuOpen, onMenuChange }: AppNavProps) {
  const [localMenu, setLocalMenu] = useState(false)
  const menu = menuOpen ?? localMenu
  const setMenu = onMenuChange ?? setLocalMenu
  const { track, pill } = useTabPill(active)

  return (
    <nav className="app-nav" aria-label="Main">
      <div ref={track} className="app-nav-track">
      <span ref={pill} className="app-nav-pill" aria-hidden="true" />
      <ul className="app-nav-list">
        {TABS.map((tab) => (
          <li key={tab}>
            <button
              type="button"
              className="app-nav-tab"
              title={LABELS[tab]}
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
        ))}
      </ul>
      </div>
      {menu && (
        <Sheet title="More" variant="menu" onClose={() => setMenu(false)}>
          <ul className="app-more">
            {more.map((item) => (
              <li key={item.label}>
                <button type="button" className="app-more-item" onClick={() => { if (!onMenuChange) setLocalMenu(false); item.onSelect() }}>
                  {item.label}
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
