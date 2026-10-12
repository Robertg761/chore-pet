import { useId, type CSSProperties } from 'react'
import {
  FURNITURE_FABRICS,
  FURNITURE_FINISHES,
  FURNITURE_PATTERNS,
  FURNITURE_STYLES,
  normalizeAppearance,
  type FurnitureAppearance,
} from '../catalog/customization'
import type { CatalogEntry } from '../catalog/types'
import { ObjectThumb } from './ObjectThumb'
import './FurnitureCustomizer.css'

export interface FurnitureCustomizerProps {
  entry: CatalogEntry
  appearance?: FurnitureAppearance
  onChange: (appearance: FurnitureAppearance | undefined) => void
}

/** Each choice updates the placed object, so the room and preview stay together. */
export function FurnitureCustomizer({ entry, appearance, onChange }: FurnitureCustomizerProps) {
  const uid = useId()
  const hasAppearance = Boolean(appearance)
  const current = normalizeAppearance(appearance)
  const style = FURNITURE_STYLES.find((option) => option.id === current.style)!
  const finish = FURNITURE_FINISHES.find((option) => option.id === current.finish)!
  const fabric = FURNITURE_FABRICS.find((option) => option.id === current.fabric)!
  const update = (change: FurnitureAppearance) => onChange({ ...current, ...change })

  return (
    <details className="furniture-customizer">
      <summary className="furniture-summary">
        <span>Customize furniture</span>
        <span className="furniture-summary-style">{appearance ? style.name : 'Original'}</span>
      </summary>
      <div className="furniture-controls">
        <div className="furniture-preview" role="img" aria-label={`${entry.name} appearance preview`}>
          <ObjectThumb entry={entry} appearance={appearance} className="furniture-preview-art" />
          <div>
            <p className="furniture-preview-title">Make it yours</p>
            <p className="furniture-preview-hint">Changes appear in your room as you choose.</p>
          </div>
        </div>

        <fieldset className="furniture-field">
          <legend>Style {!hasAppearance && <span>Original</span>}</legend>
          <div className="furniture-styles">
            {FURNITURE_STYLES.map((option) => (
              <label key={option.id} className="furniture-choice furniture-style" title={option.description}>
                <input type="radio" name={`${uid}-style`} value={option.id} aria-label={`${option.name} style`} checked={hasAppearance && current.style === option.id} onChange={() => update({ style: option.id })} />
                <ObjectThumb entry={entry} appearance={{ ...current, style: option.id }} className="furniture-style-art" />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
          <p className="furniture-help">{hasAppearance ? style.description : 'Original appearance. Choose a style or material to start customizing.'}</p>
        </fieldset>

        <fieldset className="furniture-field">
          <legend>Finish <span>{hasAppearance ? finish.name : 'Original'}</span></legend>
          <div className="furniture-swatches furniture-finishes">
            {FURNITURE_FINISHES.map((option) => (
              <label key={option.id} className="furniture-choice furniture-swatch" title={option.name} style={{ '--swatch': option.color } as CSSProperties}>
                <input type="radio" name={`${uid}-finish`} value={option.id} aria-label={`${option.name} finish`} checked={hasAppearance && current.finish === option.id} onChange={() => update({ finish: option.id })} />
                <span className="furniture-swatch-color" aria-hidden="true" />
                <span className="sr-only">{option.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="furniture-field">
          <legend>Fabric &amp; accents <span>{hasAppearance ? fabric.name : 'Original'}</span></legend>
          <div className="furniture-swatches furniture-fabrics">
            {FURNITURE_FABRICS.map((option) => (
              <label key={option.id} className="furniture-choice furniture-swatch" title={option.name} style={{ '--swatch': option.color } as CSSProperties}>
                <input type="radio" name={`${uid}-fabric`} value={option.id} aria-label={`${option.name} fabric`} checked={hasAppearance && current.fabric === option.id} onChange={() => update({ fabric: option.id })} />
                <span className="furniture-swatch-color" aria-hidden="true" />
                <span className="sr-only">{option.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="furniture-field">
          <legend>Pattern {!hasAppearance && <span>Original</span>}</legend>
          <div className="furniture-patterns">
            {FURNITURE_PATTERNS.map((option) => (
              <label key={option.id} className="furniture-choice furniture-pattern">
                <input type="radio" name={`${uid}-pattern`} value={option.id} aria-label={`${option.name} pattern`} checked={hasAppearance && current.pattern === option.id} onChange={() => update({ pattern: option.id })} />
                <span className={`furniture-pattern-sample furniture-pattern-${option.id}`} aria-hidden="true" />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="furniture-details">
          <input type="checkbox" aria-label="Decorative details" checked={current.details} onChange={(event) => update({ details: event.target.checked })} />
          <span>Decorative details<span className="furniture-help">Trim, stitching and little finishing touches.</span></span>
        </label>
        <button type="button" className="btn btn-quiet furniture-reset" aria-label="Reset furniture appearance" disabled={!appearance} onClick={() => onChange(undefined)}>Reset to original</button>
      </div>
    </details>
  )
}
