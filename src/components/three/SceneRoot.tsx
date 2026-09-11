'use client'

import { Suspense, useEffect, useState } from 'react'
import { Canvas, invalidate } from '@react-three/fiber'
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei'
import * as THREE from 'three'

import { DEBUG_HANDLES } from '@/lib/debugHandles'
import { postForTier } from '@/lib/tier'
import { registerInvalidate, useScene } from '@/lib/useScene'
import { Stage } from './Stage'
import { StudioEnvironment } from './StudioEnvironment'
import { Post } from './fx/Post'
import { DevStats } from './DevStats'

interface SceneRootProps {
  /** +1 in LTR, -1 in RTL. Resolved on the server from the locale. */
  sign: 1 | -1
  /** Pre-rendered still shown when WebGL is unavailable. */
  fallbackSrc: string
}

/**
 * THE canvas. One for the whole site, mounted once in the locale layout, fixed
 * behind the page while DOM sections scroll over it.
 *
 * Not one per section: every canvas is its own WebGL context, its own render loop
 * and its own compile stall, and browsers start silently killing the oldest
 * context at around sixteen of them.
 */
export function SceneRoot({ sign, fallbackSrc }: SceneRootProps) {
  const webgl = useScene((s) => s.webgl)
  const lowPower = useScene((s) => s.lowPower)
  const frameloop = useScene((s) => s.frameloop)
  const tier = useScene((s) => s.tier)
  // Compact drops the whole post stack; mid keeps it minus chromatic aberration.
  const post = postForTier(tier, lowPower)
  const shadows = !lowPower && tier !== 'compact'

  // Hand the real invalidate() to the DOM side, which cannot import it without
  // dragging three.js into the first-viewport bundle.
  useEffect(() => registerInvalidate(invalidate), [])

  /**
   * Let the canvas render once before the store's frameloop is honoured.
   *
   * With frameloop 'never' from the very first render — which is what a page
   * opened in a background tab gets — R3F creates the root but never draws, so
   * nothing in the scene is ever real. One forced frame costs nothing and removes
   * the whole class of problem.
   *
   * Worth knowing when debugging this from outside: a background tab also never
   * fires the ResizeObserver R3F measures the container with, so the canvas sits
   * at its default 300×150 and the subtree does not mount until the tab is
   * actually painted. That is browser behaviour, not a bug — but it means any
   * automated check must force a paint (a screenshot will do) BEFORE it probes.
   */
  const [rootReady, setRootReady] = useState(false)

  // Never let the canvas take focus or announce itself. Every headline, spec and
  // product name exists as real DOM text; the canvas is illustration.
  if (!webgl) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fallbackSrc}
          alt=""
          className="h-full w-full object-contain opacity-70"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <Canvas
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: true,
          // Only in dev and in a NEXT_PUBLIC_VERIFY build: lets a probe read the
          // composited frame back, which is how the plume core is checked against
          // the bloom threshold. It costs bandwidth, so an ordinary build omits it.
          preserveDrawingBuffer: DEBUG_HANDLES,
        }}
        // The single highest-leverage performance line here. A 3× DPR phone
        // renders 2.25× the pixels of a 2× clamp for no perceptible gain.
        dpr={lowPower || tier === 'compact' ? [1, 1.5] : [1, 2]}
        // FOV 35 is a mild telephoto: it flatters cylinders. A wide 60–75 bows
        // the canister and reads as a video game.
        camera={{ fov: 35, near: 0.05, far: 40, position: [0, 0.28, 1.15] }}
        frameloop={rootReady ? frameloop : 'always'}
        shadows={shadows}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          setRootReady(true)
        }}
      >
      {/*
        ATMOSPHERIC FALLOFF, and the colour is not a choice.

        The canvas runs alpha:true, so the page ground IS the scene's background;
        fog must be the same --ink or geometry stops dissolving into the horizon
        and starts dissolving into a slightly different grey.

        Added for the floor, which needed it most. A ground plane seen at a grazing
        angle compresses its far metres into a handful of pixels, so however gently
        its alpha falls off the rim still lands as a hard line ruled across the
        frame — and a hard line across the frame reads as a horizon in a room that
        does not exist. Fading by DISTANCE puts the falloff where the geometry is
        rather than where the texture is, and the same fog does the arc a favour:
        the far end of the lineup now recedes instead of sitting flat.
      */}
      <fog attach="fog" args={['#0E0F11', 2.4, 9]} />

        <SceneLighting shadows={shadows} />

        {/* Per-section boundary, not one around the whole scene — a single
            boundary means the last model to load blocks the first section. */}
        <Suspense fallback={null}>
          <StudioEnvironment />
          <Stage sign={sign} />
          {/* Warms every material's shader during load. A 40 ms compile stall
              mid-scroll is what this prevents — and section 03 cannot afford one.
              This one reaches the hero and whatever has resolved with it; the
              below-the-fold scenes resolve in their own boundary in Stage and
              carry a second <Preload all /> that runs when they land. */}
          <Preload all />
          {/* Post-processing is tiered: the full stack at >=1280, the same stack
              minus chromatic aberration at 768-1279, nothing below that. */}
          {post !== 'none' && <Post variant={post} />}
        </Suspense>

        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <DevStats />
      </Canvas>
    </div>
  )
}

/**
 * Three lights and an environment, no more. The metals take their appearance from
 * the environment map; these only shape it.
 */
function SceneLighting({ shadows }: { shadows: boolean }) {
  return (
    <>
      {/* Key. The ONLY shadow caster — each additional one is a full extra scene
          render. */}
      <directionalLight
        position={[2.4, 3.2, 2.0]}
        intensity={2.6}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* Cool rim, for edge separation against the void. */}
      <directionalLight position={[-2.0, 0.9, -1.4]} intensity={0.7} color="#8FB6FF" />
      <ambientLight intensity={0.12} />
    </>
  )
}
