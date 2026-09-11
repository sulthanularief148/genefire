import * as THREE from 'three'

/**
 * A radial ramp for an alphaMap, as a canvas texture: centre to rim, by stop.
 *
 * GREYSCALE ON OPAQUE BLACK, not white fading to transparent. three reads an
 * alphaMap from the GREEN channel, and a canvas is uploaded un-premultiplied: every
 * pixel of `rgba(255,255,255,0.05)` comes back as green 255. A transparent-white
 * gradient therefore arrives as a SOLID disc with a hard rim.
 *
 * That is not hypothetical. The floor was built that way and never faded at all —
 * it was a flat 62% disc seven metres across whose rim the fog was hiding, and
 * whose far edge drew the horizon line across the upper third of every section
 * that stands a product on it. The hero's backdrop glow, built the same way, came
 * out as a brown ellipse across the frame on its first render.
 *
 * A texture rather than a shader: there is no .glsl loader here, and a canvas
 * gradient is cheaper to make, compile and read than a shader that would do
 * nothing a gradient cannot. Linear, not sRGB — these numbers are opacities.
 */
export function radialRamp(
  /** [position 0–1 from the centre, opacity 0–1] pairs. */
  stops: ReadonlyArray<readonly [number, number]>,
  size = 128,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [at, alpha] of stops) {
    const v = Math.round(alpha * 255)
    g.addColorStop(at, `rgb(${v},${v},${v})`)
  }
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}
