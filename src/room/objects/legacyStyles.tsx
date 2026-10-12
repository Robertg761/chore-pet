import type { ReactNode } from 'react'
import type { FurnitureAppearance } from '../../catalog/customization'
import type { MessStage } from '../../domain/types'
import { LegacyStyledArt } from './legacyRender'
import type { ObjectArt } from './types'

/** The registry supplies raw art, so rendering preserves the original and cannot recurse. */
export function customizeLegacyArt(art: ObjectArt, stage: MessStage, appearance?: FurnitureAppearance): ReactNode {
  if (!appearance) return art.render(stage)
  return <LegacyStyledArt art={art} stage={stage} appearance={appearance} />
}
