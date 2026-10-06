import { fishTankArt } from './fishTank'
import { lampArt } from './lamp'
import { plantArt } from './plant'
import { posterArt } from './poster'
import type { ObjectArt } from './types'

// Phase 5 decor rewards (plant, lamp, poster, fish tank). Each lives in its own file and is listed here.
export const decor: ObjectArt[] = [plantArt, lampArt, posterArt, fishTankArt]
