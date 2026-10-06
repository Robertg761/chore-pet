import { useEffect, useState } from 'react'
import { todayISO } from '../domain/dates'

/** Today's local ISO date, updated when the day rolls over while the app is open. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const tick = () => setToday(todayISO())
    const timer = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return today
}
