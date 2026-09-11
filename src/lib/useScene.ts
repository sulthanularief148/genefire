import { create } from 'zustand'

import { currentTier, type Tier } from './tier'

/**
 * The single bridge between the DOM and the WebGL canvas.
 *
 * There are deliberately TWO channels here, and the split is the whole point:
 *
 *   useScene()  — React state. Changes rarely: which section is on screen, which
 *                 product is featured, whether we are in reduced-motion or
 *                 low-power mode. Every write re-renders the subscribed tree.
 *
 *   scroll      — a plain mutable object OUTSIDE React. Written by scroll handlers
 *                 up to 60 times a second and read inside useFrame. It never
 *                 re-renders anything. A useState in a scroll-linked animation
 *                 re-renders the tree 60 times a second; this is how we avoid it.
 *
 * If you are about to call a setter from an onUpdate handler, you want `scroll`.
 */

/** Which chapter of the page the canvas is currently illustrating. */
export type SceneMode =
  | 'hero'
  | 'problem'
  | 'activation'
  | 'series'
  | 'product'
  | 'coverage'
  | 'applications'
  | 'about'
  /** The quiet sections — comparison, certifications: no scene at all. */
  | 'rest'
  /** Contact: the globe again, low, as a horizon with Riyadh lit on it. */
  | 'contact'

/**
 * R3F render policy.
 *   'always' — an idle animation is on screen (the hero turntable, drifting
 *              aerosol). A demand loop that calls invalidate() every frame is
 *              strictly worse than 'always', so we switch rather than fake it.
 *   'demand' — nothing moves unless scroll or an interaction invalidates.
 *   'never'  — the canvas is off screen or the tab is hidden.
 */
export type FrameLoop = 'always' | 'demand' | 'never'

export interface SceneState {
  /** Product id from assets/products.json, or null when no product is featured. */
  active: string | null
  /**
   * COARSE progress through the active section, 0–1. Written on section
   * transitions and when scrolling settles — never per frame. Per-frame progress
   * lives on `scroll`.
   */
  progress: number
  mode: SceneMode
  /** prefers-reduced-motion. An accessibility requirement, not an optimisation. */
  reduced: boolean
  /** Phone or ≤4 cores: no post-processing, lower dpr, fewer particles, no shadows. */
  lowPower: boolean
  /** False when the browser or GPU cannot give us a WebGL2 context. */
  webgl: boolean
  frameloop: FrameLoop
  /** Viewport tier. Separate from lowPower, which is about the device. */
  tier: Tier
  /**
   * DOM id of the section currently on screen.
   *
   * Distinct from `mode`: eleven product pins all share mode 'product', and the
   * locale switch has to come back to the one the reader was actually looking at.
   */
  section: string
  /**
   * Enclosure the coverage calculator is sizing, in metres. Written when an input
   * changes — an interaction, not a frame — so React state is the right home.
   */
  room: { l: number; w: number; h: number }

  setMode: (mode: SceneMode, active?: string | null) => void
  setActive: (active: string | null) => void
  setProgress: (progress: number) => void
  setReduced: (reduced: boolean) => void
  setLowPower: (lowPower: boolean) => void
  setWebgl: (webgl: boolean) => void
  setFrameloop: (frameloop: FrameLoop) => void
  setTier: (tier: Tier) => void
  setSection: (section: string) => void
  setRoom: (room: { l: number; w: number; h: number }) => void
}

export const useScene = create<SceneState>((set) => ({
  active: 'sx300',
  progress: 0,
  mode: 'hero',
  reduced: false,
  lowPower: false,
  webgl: true,
  frameloop: 'always',
  tier: 'full',
  section: 'hero',
  room: { l: 3, w: 2.5, h: 2 },

  setMode: (mode, active) => set((s) => ({ mode, active: active === undefined ? s.active : active })),
  setActive: (active) => set({ active }),
  setProgress: (progress) => set({ progress }),
  setReduced: (reduced) => set({ reduced }),
  setLowPower: (lowPower) => set({ lowPower }),
  setWebgl: (webgl) => set({ webgl }),
  setFrameloop: (frameloop) => set({ frameloop }),
  setTier: (tier) => set({ tier }),
  setSection: (section) => set({ section }),
  setRoom: (room) => set({ room }),
}))

/**
 * Is one of `modes` the section currently on screen?
 *
 * THE RULE: an object's visibility is owned by the ACTIVE SECTION. A monotonic
 * progress value is not a visibility condition — `scroll.problem > 0` is true
 * forever once the user has scrolled past section 02, so anything gated on it
 * latches on and follows them down the rest of the page.
 *
 * Pass a module-level constant array so the selector result stays stable.
 */
export function useVisibleIn(modes: readonly SceneMode[]): boolean {
  return useScene((s) => modes.includes(s.mode))
}

/**
 * Per-frame scroll values. Mutable, outside React, read in useFrame.
 *
 * One channel per pinned section so sections never fight over a single
 * `progress` field during the overlap while one pins and the next unpins.
 */
export const scroll = {
  /** Whole-document progress, 0–1. Drives the progress rail. */
  page: 0,
  /** Section 01 — hero, 0–1. */
  hero: 0,
  /** Section 02 — the problem, 0–1. */
  problem: 0,
  /** Section 03 — activation, 0–1. */
  activation: 0,
  /** Section 04 — the series rail, 0–1. */
  series: 0,
  /** Section 05 — the active product pin, 0–1. */
  product: 0,
  /** Section 06 — coverage calculator, 0–1 (not pinned; kept for symmetry). */
  coverage: 0,
  /** Section 07 — applications drum, 0–1. */
  applications: 0,
  /** About — the network globe, 0–1. */
  about: 0,
}

export type ScrollChannel = keyof typeof scroll

/**
 * Pointer position, -1 to 1 on each axis from the centre of the viewport.
 *
 * The second mutable channel, and it lives here for the same reason as `scroll`:
 * it changes on every pointer move, it is read inside useFrame, and routing it
 * through React state would re-render the tree on mouse movement.
 *
 * `active` is false on touch devices and under reduced motion, where the camera
 * ignores it entirely — a finger has no hover position, and a camera that lurches
 * to wherever the last tap landed is worse than a still one.
 */
export const pointer = {
  x: 0,
  y: 0,
  active: false,
}

/**
 * Snap every channel to its finished state. Used when reduced motion is on, so
 * the scene shows its final framing instead of its opening one.
 */
export function settleScroll(value = 1) {
  for (const key of Object.keys(scroll) as ScrollChannel[]) scroll[key] = value
}

/* ------------------------------------------------------------- rendering --- */

/**
 * Indirection around R3F's invalidate().
 *
 * Scroll handlers live in the DOM bundle and must ask the canvas to draw a frame,
 * but importing from @react-three/fiber to get invalidate() would pull three.js
 * into the first-viewport bundle and undo the dynamic import of SceneRoot. The
 * canvas registers the real function once it mounts; until then this is a no-op,
 * which is correct — there is nothing to redraw yet.
 */
let invalidateFn: (() => void) | null = null

export function registerInvalidate(fn: () => void) {
  invalidateFn = fn
  return () => {
    if (invalidateFn === fn) invalidateFn = null
  }
}

/** Ask the canvas for one frame. Safe to call before the canvas exists. */
export function requestRender() {
  invalidateFn?.()
}

/** Reads the viewport tier now. Called on mount and on resize, never per frame. */
export function detectTier(): Tier {
  return currentTier()
}

/** Device capability sniff. Called once on mount; never during a frame. */
export function detectCapabilities() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lowPower =
    /Android|iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.hardwareConcurrency ?? 8) <= 4
  return { reduced, lowPower }
}

/** True when the browser can actually give us a WebGL2 context. */
export function detectWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
