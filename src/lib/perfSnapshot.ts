/**
 * Shared between the in-canvas sampler and the DOM overlay that displays it.
 *
 * It lives in its own module with NO @react-three/fiber import, because the DOM
 * overlay is mounted eagerly and anything it imports lands in the first-viewport
 * bundle. Importing useFrame here would drag all of three.js onto the critical
 * path — that is measured, not theoretical.
 */
export interface PerfSnapshot {
  fps: number
  calls: number
  triangles: number
  programs: number
  geometries: number
  textures: number
}

/** Written in the render loop, read by the overlay. Never React state. */
export const perf: PerfSnapshot = {
  fps: 0,
  calls: 0,
  triangles: 0,
  programs: 0,
  geometries: 0,
  textures: 0,
}

export { DEBUG_HANDLES as isDev } from './debugHandles'
