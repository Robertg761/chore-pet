import type { ReactNode } from 'react'
import { CheerMarks } from './accent'
import { CharacterLayers, type CharacterProps } from './Character'
import type { MotionFrame } from './motion'
import { RestingFaceMotion, Shadow, WithoutShadow } from './parts'
import { poseNameFor } from './poses'
import { articulatedPose, articulatedTransform, characterShadowRadius, finiteMotionFrame } from './species/animatedBody'
import { StrokeScaleContext } from './strokeScale'

/** Sampled SVG art only. The integration owner supplies the clock and isolates frame updates. */
export function AnimatedCharacterArt({ species, mood, pose, frame: input, ...props }: Omit<CharacterProps, 'size' | 'title'> & { frame: MotionFrame }): ReactNode {
  const frame = finiteMotionFrame(input)
  const requestedPose = pose ?? poseNameFor(mood)
  const poseName = mood === 'sick' ? 'sick' : mood === 'scruffy' && requestedPose === 'cheering' ? 'scruffy' : requestedPose
  const resting = poseName === 'sleeping' || poseName === 'sick'
  const p = articulatedPose(species, frame, poseName)
  const layers = <CharacterLayers {...props} species={species} mood={mood} p={p} />
  return (
    <g className="ch-animated" data-character-pose={poseName}>
      <g data-character-ground="" opacity={resting ? 1 : frame.shadowOpacity} transform={`translate(100 186) scale(${resting ? 1 : frame.shadowScale} 1) translate(-100 -186)`}>
        <Shadow rx={characterShadowRadius(species, poseName)} />
      </g>
      <g data-character-body="" transform={resting ? undefined : articulatedTransform(species, frame, poseName)}>
        <WithoutShadow>
          {resting ? <RestingFaceMotion gaze={frame.expression === 'alert' ? { x: frame.gazeX, y: frame.gazeY } : { x: 0, y: 0 }}>{layers}</RestingFaceMotion> : layers}
        </WithoutShadow>
      </g>
      <g data-character-accents="" aria-hidden="true" pointerEvents="none" opacity={resting ? 0 : frame.accentOpacity}>
        <StrokeScaleContext.Provider value={props.strokeScale ?? 1}>
          <CheerMarks heart={[24, 66, 18]} star={[176, 54, 16]} />
        </StrokeScaleContext.Provider>
      </g>
    </g>
  )
}
