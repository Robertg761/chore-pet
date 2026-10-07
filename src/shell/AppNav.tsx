import { useState, type ReactNode } from 'react'
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
export function AppNav({ active, onNavigate, rewardsNote, more, note }: AppNavProps) {
  const [menu, setMenu] = useState(false)

  return (
    <nav className="app-nav" aria-label="Main">
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
      {menu && (
        <Sheet title="More" variant="menu" onClose={() => setMenu(false)}>
          <ul className="app-more">
            {more.map((item) => (
              <li key={item.label}>
                <button type="button" className="app-more-item" onClick={() => (setMenu(false), item.onSelect())}>
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
