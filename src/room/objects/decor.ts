import { fairyLightsArt } from './fairyLights'
import { fishTankArt } from './fishTank'
import { lampArt } from './lamp'
import { plantArt } from './plant'
import { posterArt } from './poster'
import { teddyArt } from './teddy'
import type { ObjectArt } from './types'

// Decor art: the cosmetic rewards (teddy, lamp, poster, fairy lights) plus the plant and fish tank,
// which bring chores but are drawn here. Each lives in its own file and is listed here.
export const decor: ObjectArt[] = [plantArt, lampArt, posterArt, fishTankArt, teddyArt, fairyLightsArt]
