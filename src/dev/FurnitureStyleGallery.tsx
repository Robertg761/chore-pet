import { useId, useState } from 'react'
import { ALL_ENTRIES } from '../catalog/objects'
import { DEFAULT_APPEARANCE, FURNITURE_FABRICS, FURNITURE_FINISHES, FURNITURE_PATTERNS, FURNITURE_STYLES, type FurnitureAppearance } from '../catalog/customization'
import type { MessStage } from '../domain/types'
import { OBJECT_ART } from '../room/objects'

/** Dev-only comparison of silhouettes and material choices, at the same scale. */
export function FurnitureStyleGallery() {
  const uid = useId()
  const [catalogId, setCatalogId] = useState('armchair')
  const [stage, setStage] = useState<MessStage>('clean')
  const [appearance, setAppearance] = useState<Required<FurnitureAppearance>>(DEFAULT_APPEARANCE)
  const entry = ALL_ENTRIES.find((item) => item.id === catalogId)!
  const art = OBJECT_ART[catalogId]

  return (
    <section aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>Furniture styles</h2>
      <div className="gallery-row">
        <label>Furniture <select aria-label="Furniture family" value={catalogId} onChange={(event) => setCatalogId(event.target.value)}>
          {ALL_ENTRIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Mess stage <select aria-label="Furniture mess stage" value={stage} onChange={(event) => setStage(event.target.value as MessStage)}>
          <option value="clean">Clean</option><option value="messy1">Messy</option><option value="messy2">Very messy</option>
        </select></label>
        <label>Finish <select aria-label="Furniture finish" value={appearance.finish} onChange={(event) => setAppearance({ ...appearance, finish: event.target.value as Required<FurnitureAppearance>['finish'] })}>
          {FURNITURE_FINISHES.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select></label>
        <label>Fabric <select aria-label="Furniture fabric" value={appearance.fabric} onChange={(event) => setAppearance({ ...appearance, fabric: event.target.value as Required<FurnitureAppearance>['fabric'] })}>
          {FURNITURE_FABRICS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select></label>
        <label>Pattern <select aria-label="Furniture pattern" value={appearance.pattern} onChange={(event) => setAppearance({ ...appearance, pattern: event.target.value as Required<FurnitureAppearance>['pattern'] })}>
          {FURNITURE_PATTERNS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select></label>
        <label><input type="checkbox" checked={appearance.details} onChange={(event) => setAppearance({ ...appearance, details: event.target.checked })} /> Details</label>
      </div>
      <div className="gallery-row" style={{ alignItems: 'stretch' }}>
        {art ? FURNITURE_STYLES.map((style) => (
          <figure key={style.id} style={{ width: 160, padding: 8, background: 'var(--card)', border: '2px solid var(--ink)', borderRadius: 12 }}>
            <svg data-furniture-preview data-style={style.id} data-catalog-id={catalogId} width="140" height="150" viewBox={`${art.bounds.x} ${art.bounds.y} ${art.bounds.width} ${art.bounds.height}`} role="img" aria-label={`${entry.name}, ${style.name}, ${stage}`}>
              <g data-furniture-drawing>{art.render(stage, { ...appearance, style: style.id })}</g>
            </svg>
            <figcaption>{style.name}</figcaption>
          </figure>
        )) : <p>This furniture's art is not available yet.</p>}
      </div>
    </section>
  )
}
