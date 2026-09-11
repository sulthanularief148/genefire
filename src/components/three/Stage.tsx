'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import * as THREE from 'three'

import { smoothstep } from '@/lib/anim'
import { BARRELS } from '@/lib/barrels'
import { LIES_FLAT, lyingOffsetFor, PLINTH_SPIN, SCROLL_SPIN } from '@/lib/heroStage'
import { HERO_SUBJECT as FEATURED } from '@/lib/heroSubject'
import { grab, stepGrab } from '@/lib/grab'
import { emberCountForTier, particleCountForTier } from '@/lib/tier'
import { scroll, useScene, useVisibleIn, type SceneMode } from '@/lib/useScene'
import { PRODUCT_MODELS } from './products'
import { AerosolDrift } from './fx/AerosolDrift'
import { AerosolField, EMBER_PRESET } from './fx/AerosolField'
import { Cabinet, ROOM_DIMENSIONS } from './Cabinet'
import { ActivationRig } from './ActivationRig'
import { CameraRig } from './CameraRig'
import { SeriesRail } from './SeriesRail'
import { ProductStage } from './ProductStage'
import { CoverageRoom } from './CoverageRoom'
import { Applications } from './Applications'
import { Ground } from './Ground'
import { DecalPoseContext, type DecalPose } from './ProductDecals'
import { HeroPlinth } from './HeroPlinth'
import { dressProduct } from './dressProduct'
import { NetworkGlobe } from './NetworkGlobe'


/* Which sections each scene belongs to. Module-level so the selector is stable. */
// The hero only. It used to stay on through section 02 to recede behind it; About
// now sits between the two, and the turntable must not reappear behind the room.
const HERO_MODES = ['hero'] as const
const ENCLOSURE_MODES = ['problem', 'activation'] as const

/**
 * Stands a unit on its base.
 *
 * The models are authored with their barrel along +Z, which contradicts hard rule
 * 9 (+Y up) and means the cylinder points at the camera until something turns it.
 * Applied as its own nested group rather than as a rotation on the turntable group,
 * because THREE.Euler 'XYZ' composes as Rx·Ry·Rz — putting both on one object
 * would spin the unit about a radial axis instead of about its own.
 */
const UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0]

/**
 * The attitude the hero subject holds on the turntable.
 *
 * Upright is model +Z (the barrel) onto world +Y. Lying is a quarter turn about
 * world Y, which lays the barrel along world +X with the carry handle on top — the
 * attitude the PX 5 is used and photographed in; see lib/heroStage.ts. It holds
 * that attitude for the whole section: there is no lineup to stand up into.
 */
const HERO_POSE = {
  rotation: (LIES_FLAT.has(FEATURED) ? [0, Math.PI / 2, 0] : UPRIGHT) as [number, number, number],
  offset: lyingOffsetFor(FEATURED, BARRELS[FEATURED] ?? BARRELS.sx300),
}

/** The printed markings follow the attitude — see DecalPose. */
const HERO_DECAL_POSE: DecalPose = LIES_FLAT.has(FEATURED) ? 'lying' : 'upright'

/**
 * Everything the canvas draws.
 *
 * All the scenes stay MOUNTED for the life of the page and hide themselves with
 * `visible` when their section is not on screen. Mounting on demand would move
 * every shader compile to the moment the user reaches the section, which is
 * exactly the 40 ms mid-scroll stall this section cannot afford.
 *
 * TWO SUSPENSE BOUNDARIES, and the split is the load-time fix.
 *
 * The hero sits in SceneRoot's boundary and nothing else heavy does, so the first
 * thing the reader sees in 3D is waiting on one model and the decal atlas — not on
 * every product, the room, the calculator's room and six environments. With a
 * single boundary the turntable could not appear until the last of those had
 * landed, which is the opposite of what the first viewport is for.
 *
 * Everything below the fold resolves in its own boundary a moment later, while the
 * reader is still on the hero, and warms its shaders there with its own
 * <Preload all />: one compile pass, at load, for all of it — not one per section
 * on arrival.
 */
export function Stage({ sign }: { sign: 1 | -1 }) {
  const reduced = useScene((s) => s.reduced)
  const lowPower = useScene((s) => s.lowPower)

  // 12 000 at the full and mid tiers, 4 000 at compact or on a low-power device.
  // Above ~20 000 the fill-rate cost of overlapping additive quads dominates and
  // you gain nothing visible.
  const tier = useScene((s) => s.tier)
  const dischargeCount = particleCountForTier(tier, lowPower)
  const emberCount = emberCountForTier(tier, lowPower)

  return (
    <group>
      <CameraRig sign={sign} />
      <FogController />

      {/* A floor for the sections that stand a product on one. */}
      <Ground />

      <HeroShowcase reduced={reduced} />

      {!lowPower && <AerosolDrift count={reduced ? 0 : 900} />}

      {/* Below the fold: resolves after the hero, compiles once. */}
      <Suspense fallback={null}>
        <EnclosureScene emberCount={emberCount} dischargeCount={dischargeCount} />

        <SeriesRail sign={sign} />

        <CoverageRoom />

        {/* Section 07. The heaviest scene on the site: only the centred
            environment and its two neighbours are mounted at any time. */}
        <Applications />

        {/* About: the GENEFIRE network on a dotted globe. */}
        <NetworkGlobe />

        <Preload all />
      </Suspense>

      {/* Section 05 mounts ONLY the active product, from the unjoined /parts
          build. Eleven unjoined products would be ~68 draw calls; one is at most
          eight. */}
      <Suspense fallback={null}>
        <ProductStage />
      </Suspense>
    </group>
  )
}

/**
 * Fog distance, per section, in metres: [where it starts, where it is solid].
 *
 * One fog for the whole scene was tuned for the product sections, where the camera
 * is within a metre or two of its subject and the fog's job is to dissolve the
 * floor's far edge. The rooms are framed from much further back — the coverage
 * room from up to nine metres, the application enclosures from six or seven —
 * and at 2.4 → 9 m they were drawn almost entirely in fog colour: a dark shape on
 * a dark page, which is why neither section showed anything you could read.
 */
const FOG: Partial<Record<SceneMode, [number, number]>> = {
  coverage: [16, 44],
  applications: [12, 36],
  // The switchgear room is now seen from outside, six or seven metres back.
  problem: [8, 30],
  activation: [8, 30],
}
const FOG_DEFAULT: [number, number] = [2.4, 9]

/** Eases the scene fog toward the active section's distances — a pull, not a cut. */
function FogController() {
  const mode = useScene((s) => s.mode)
  useFrame((state, dt) => {
    const fog = state.scene.fog as THREE.Fog | null
    if (!fog || !('near' in fog)) return
    const [near, far] = FOG[mode] ?? FOG_DEFAULT
    const k = 1 - Math.exp(-2.5 * dt)
    fog.near += (near - fog.near) * k
    fog.far += (far - fog.far) * k
  })
  return null
}

/**
 * Sections 02 and 03 share one room, so they share one group. Section 03 is
 * literally section 02's cabinet with the unit in it — cutting away to a
 * different space between them would throw away the whole setup.
 */
function EnclosureScene({
  emberCount,
  dischargeCount,
}: {
  emberCount: number
  dischargeCount: number
}) {
  // Owned by the active section. The previous condition — problem > 0 — never
  // went false once passed, so the cabinet followed the user into sections 04 and
  // 05 and put its four draw calls into the exploded product's budget.
  const visible = useVisibleIn(ENCLOSURE_MODES)

  return (
    <group visible={visible}>
      <Cabinet />

      {/*
        Embers. Same shader as the discharge with a different uniform set — one
        program, one compile, not two. They rise through section 02 and die during
        the suppression beat of section 03.
      */}
      <AerosolField
        count={emberCount}
        preset={EMBER_PRESET}
        channel="problem"
        position={[0.34, 0.55, -ROOM_DIMENSIONS.d / 2 + 0.62]}
        clear={() => smoothstep(0.5, 0.78, scroll.activation)}
      />

      <ActivationRig particleCount={dischargeCount} />
    </group>
  )
}

/**
 * Section 01. ONE unit, on a turntable, and nothing else.
 *
 * The PX 5 lies on a slowly turning platter. The scroll adds just under half a turn
 * on top of the idle spin while the camera brings the unit from beside the copy to
 * the centre of the frame, where the DOM names it and gives its figures — see
 * lib/heroStage.ts for the beats and the two shots.
 *
 * The rotation is ACCUMULATED rather than read from the clock, and the scroll's
 * share is added on top as a pure function of progress. `time * rate` would jump
 * whenever the rate changed; the accumulated angle simply carries on from where it
 * is, and the scroll term winds back exactly when the reader scrolls back up.
 */
function HeroShowcase({ reduced }: { reduced: boolean }) {
  const active = useVisibleIn(HERO_MODES)
  const Model = PRODUCT_MODELS[FEATURED]

  const group = useRef<THREE.Group>(null)
  /** Platter and product, turned together from one angle. */
  const platter = useRef<THREE.Group>(null)
  const product = useRef<THREE.Group>(null)
  const turntable = useRef(0)
  // In the scene graph (as a primitive below) so its matrix updates with it.
  const [spotTarget] = useState(() => new THREE.Object3D())

  // The product components are gltfjsx output and are never hand-edited, so
  // shadow flags are applied here rather than per mesh in the generated file.
  /**
   * Applied from the frame loop, not from an effect, and retried until it takes.
   *
   * The product component suspends on useGLTF, so on the pass where an effect would
   * run its children are placeholders and the traversal walks an empty subtree.
   * Retrying costs one traversal per frame until the model lands and nothing
   * afterwards.
   */
  const dressed = useRef(false)
  const ownMaterials = useRef<THREE.Material[]>([])

  useEffect(() => {
    const owned = ownMaterials.current
    return () => owned.forEach((m) => m.dispose())
  }, [])

  useFrame((_, dt) => {
    // Reduced motion holds the OPENING shot, not the final one: that is the frame
    // the copy is composed against, and under reduced motion the copy never leaves.
    const p = reduced ? 0 : scroll.hero

    // Shadows, no brackets, and the satin display finish — see dressProduct.
    if (!dressed.current && product.current) {
      dressed.current = dressProduct(product.current, ownMaterials.current) > 0
    }

    if (group.current) group.current.visible = active

    // Frozen under reduced motion: the turntable holds its presentation angle.
    // Paused while the reader has hold of it, so the drag is the only motion.
    if (!reduced && !grab.hero.held) turntable.current += dt * PLINTH_SPIN
    // Plus whatever the reader has spun it by — see GrabZone. Unbounded and not
    // sprung back: a turntable you turn by hand stays where you leave it.
    const angle =
      PRESENTATION_ANGLE +
      turntable.current +
      SCROLL_SPIN * smoothstep(0.08, 0.92, p) +
      stepGrab('hero', dt)
    if (platter.current) platter.current.rotation.y = angle
    if (product.current) product.current.rotation.y = angle
  })

  return (
    <group ref={group}>
      {/*
        HERO-ONLY KEY AND RIM.

        Lights are scene-wide in three, so these are gated on `visible` — a light
        in a hidden group is skipped, which is how a section gets its own lighting
        without a second scene.

        The rim does the separating: behind and above, it draws the bright edge that
        lifts a red silhouette off a charcoal page. The key is soft and warm, and
        deliberately modest. The PX 5 is a glossy red polymer, and at the previous
        intensity its whole broadside caught the key above the bloom threshold and
        rendered the brand red as white with a pink edge.
      */}
      {/*
        Both are AIMED AT THE PRODUCT, not at the floor. A spot's target defaults
        to the world origin, which here is the floor under the turntable, and with
        no shadows the cone went straight through the plinth and laid a grey pool
        on the floor under the headline. Aimed at the product with tight cones, the
        spill lands behind the drum, where it reads as the turntable's own light.
      */}
      <group visible={active}>
        <primitive object={spotTarget} position={[0, HERO_AIM_Y, 0]} />
        <spotLight
          position={[0.55, 0.78, 0.62]}
          target={spotTarget}
          angle={0.36}
          penumbra={0.9}
          // A punctual light delivers intensity/d², and at ~0.9 m this one alone
          // put the red body's lit face past 1.0 before the environment added
          // anything. ACES desaturates a red that bright toward pink; 0.9 keeps
          // the brand red a red.
          intensity={0.9}
          distance={1.9}
          color="#FFF1E0"
        />
        {/* The rim: behind and above, cool, so it reads as a separate source. It
            was the white band along the top of the barrel at 4.5. */}
        <spotLight
          position={[-0.5, 0.72, -0.7]}
          target={spotTarget}
          angle={0.4}
          penumbra={0.9}
          intensity={2.2}
          distance={1.9}
          color="#CFE0FF"
        />
      </group>

      <HeroPlinth ref={platter} />

      {/* The product rides the same angle as the platter from its own group, so the
          attitude below never shares an object with the turntable rotation —
          THREE.Euler 'XYZ' composes as Rx·Ry·Rz. */}
      <group ref={product}>
        <group position={HERO_POSE.offset} rotation={HERO_POSE.rotation}>
          <DecalPoseContext.Provider value={HERO_DECAL_POSE}>
            {Model && <Model />}
          </DecalPoseContext.Provider>
        </group>
      </group>
    </group>
  )
}

/**
 * The angle the turntable starts at: the three-quarter view, bell toward the
 * camera and the printed side facing it, rather than a flat side-on profile.
 */
const PRESENTATION_ANGLE = -0.55

/** Height the hero lights aim at: the middle of the product on its platter. */
const HERO_AIM_Y = 0.17
