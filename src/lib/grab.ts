/**
 * Grab-to-turn: the reader drags a 3D subject round with the mouse (or a finger).
 *
 * The canvas sits BEHIND the page and never receives a pointer event — every
 * section's DOM is on top of it. So the drag is caught in the DOM, by a GrabZone laid
 * over the subject, and handed to the scene through this plain mutable object: the
 * same pattern as `scroll` and `pointer` in useScene — written by event handlers,
 * read in useFrame, never React state.
 *
 * The zone writes the angle directly while the pointer is down, and a velocity on
 * release; the scene integrates the fling and its decay with stepGrab() each frame.
 * One object per subject, so turning the globe never turns the turntable.
 */

export type GrabTarget = 'hero' | 'globe' | 'series' | 'coverage' | 'applications'

export interface GrabState {
  /** Radians the reader has turned the subject by, on top of its own motion. */
  yaw: number
  /** Radians per second, carried after release and decaying. */
  velocity: number
  held: boolean
}

function state(): GrabState {
  return { yaw: 0, velocity: 0, held: false }
}

export const grab: Record<GrabTarget, GrabState> = {
  hero: state(),
  globe: state(),
  series: state(),
  coverage: state(),
  applications: state(),
}

/** Radians per CSS pixel of horizontal drag. A full-width drag is about one turn. */
export const GRAB_GAIN = 0.0085

/** How fast a fling dies away, per second. */
const FRICTION = 3.2

export interface GrabOptions {
  /**
   * Rate, per second, at which the subject returns to where it was before the
   * drag. 0 leaves it where the reader put it.
   */
  spring?: number
  /** Largest turn either way, radians. */
  limit?: number
}

/**
 * Advance one subject by a frame: carry the fling, let it decay, spring it home.
 * Call ONCE per frame per target, from the one component that owns the subject.
 */
export function stepGrab(target: GrabTarget, dt: number, options: GrabOptions = {}): number {
  const g = grab[target]
  if (!g.held) {
    g.yaw += g.velocity * dt
    g.velocity *= Math.exp(-FRICTION * dt)
    if (Math.abs(g.velocity) < 0.0005) g.velocity = 0
    if (options.spring) g.yaw *= Math.exp(-options.spring * dt)
  }
  if (options.limit !== undefined) {
    g.yaw = Math.max(-options.limit, Math.min(options.limit, g.yaw))
  }
  return g.yaw
}
