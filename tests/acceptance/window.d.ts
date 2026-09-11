/**
 * The inspection handles the scene installs on `window` when DEBUG_HANDLES is on.
 *
 * Typed here rather than reached for with `any`, so a rename in the app is a
 * compile error in the suite instead of an undefined at 2am.
 */
import type * as THREE from 'three'

export interface TriggerInfo {
  id: string
  start: number
  end: number
  pinned: boolean
  progress: number
}

export interface PerfSnapshot {
  fps: number
  calls: number
  triangles: number
  programs: number
  geometries: number
  textures: number
}

export interface ScrubDriftEntry {
  material: string
  uniform: string
  progress: number
  forward: number
  backward: number
  delta: number
}

export interface ScrubAuditResult {
  channel: string
  samples: number
  uniformsPerSample: number
  drift: ScrubDriftEntry[]
  ok: boolean
}

export interface SceneStoreApi {
  getState: () => {
    setFrameloop: (value: 'always' | 'demand' | 'never') => void
    setMode: (mode: string, active?: string | null) => void
    setReduced: (reduced: boolean) => void
    reduced: boolean
    mode: string
    active: string | null
  }
}

declare global {
  interface Window {
    __scene?: {
      store: SceneStoreApi
      scroll: Record<string, number>
      triggers: () => TriggerInfo[]
      refresh: () => void
      /** Absolute scroll, routed through Lenis so ScrollTrigger actually sees it. */
      scrollTo: (y: number) => void
      /** Current viewport tier: full | mid | compact. */
      tier: () => string
    }
    __three?: {
      gl: THREE.WebGLRenderer
      scene: THREE.Scene
      camera: THREE.Camera
      perf: PerfSnapshot
      advance: (timestamp: number) => void
      auditScrub: (channel?: string, samples?: number) => ScrubAuditResult
    }
    __verifyClock?: number
  }
}
