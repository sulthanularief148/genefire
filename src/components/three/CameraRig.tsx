'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { lerp, smoothstep } from '@/lib/anim'
import { applicationsFramingAt } from '@/lib/environments'
import { BARRELS } from '@/lib/barrels'
import { anchorSubject, lerpFraming, productFramingFor, type Framing } from '@/lib/framing'
import { isHeroSplit } from '@/lib/heroLayout'
import { HERO_MOVE, HERO_SHOTS, heroDistanceFor, heroGroupFor } from '@/lib/heroStage'
import { HERO_SUBJECT } from '@/lib/heroSubject'
import { CONTACT_SHOTS, GLOBE, GLOBE_SHOTS, globeDistanceFor } from '@/lib/network'
import { isPinnedAtTier } from '@/lib/tier'
import { pointer, scroll, useScene } from '@/lib/useScene'
import {
  SERIES_SHOTS,
  SERIES_STAGES,
  STAGE_GAP,
  seriesDistanceFor,
  seriesStageAt,
} from '@/lib/seriesStage'
import { ROOM_DIMENSIONS } from './Cabinet'
import { ACTIVATION_MOUNT } from './ActivationRig'
import { APPLICATIONS_FRAMING } from './Applications'

/* Scratch. Nothing allocates inside useFrame. */
const camTarget = new THREE.Vector3()
const lookTarget = new THREE.Vector3()
const framing: Framing = { distance: 0, anchorY: 0, anchorX: 0 }
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const up = new THREE.Vector3()

/**
 * The single owner of the camera.
 *
 * Every section describes where it wants the camera; this resolves which one is
 * speaking and damps toward it. One writer avoids several useFrame handlers
 * fighting over `state.camera` at section boundaries.
 *
 * Sections declare framings as DISTANCE + SCREEN ANCHOR rather than as camera
 * coordinates — see lib/framing.ts. That is what keeps the product off the copy at
 * every progress value rather than only at the two ends someone checked.
 *
 * The targets are pure functions of progress. The damping is the one deliberate
 * exception — a display filter over a pure target, so it converges to the same
 * place whichever direction the user scrubbed from.
 */

/**
 * Section 01 frames the turntable and the product on it as ONE group, solved from
 * the subject's measured bounds — so swapping which unit opens the site reframes
 * it instead of leaving a different-shaped product at a distance chosen for the
 * old one. The shots themselves are authored in lib/heroStage.ts.
 */
const HERO_GROUP = heroGroupFor(HERO_SUBJECT, BARRELS[HERO_SUBJECT] ?? BARRELS.sx300)


/**
 * Section 05 — one product, with the spec column beside it.
 *
 * anchorX is measured from the INLINE-START edge, which is
 * the edge the copy occupies: the eyebrow, the model name, the five-row spec
 * table and the datasheet link, in a max-w-md column 448px wide — 35% of a
 * 1280 viewport. Anchoring the product at 0.32 put it inside that column, and it
 * rendered directly over 'Total weight' and 'Protected volume' in both
 * languages. The product belongs on the far side, with the callouts between.
 */
// Distance is solved per product; only the anchors are authored here.
const PRODUCT_NEAR: Framing = { distance: 1, anchorY: 0.5, anchorX: 0.66 }
const PRODUCT_EXPLODED: Framing = { distance: 1, anchorY: 0.5, anchorX: 0.66 }

/** Lateral camera travel at full pointer deflection, in metres. */
const POINTER_LATERAL = 0.035

/** Vertical travel. Less than lateral: a camera that bobs reads as unstable. */
const POINTER_VERTICAL = 0.018


/** The display sections, where the pointer lean is half as much again. */
const LEAN_MODES: ReadonlySet<string> = new Set(['hero', 'about', 'series', 'coverage', 'applications'])

/**
 * The hero's arrival, in seconds: on first load the camera comes in from further
 * out and higher up and settles on the opening shot, on the same beat as the
 * turntable's lights coming on (HeroPlinth). A clock, not scroll — it happens once,
 * and never under reduced motion.
 */
const INTRO_SECONDS = 2.4

export function CameraRig({ sign }: { sign: 1 | -1 }) {
  const mode = useScene((s) => s.mode)
  const reduced = useScene((s) => s.reduced)
  const active = useScene((s) => s.active)
  const tier = useScene((s) => s.tier)
  /** Clock time of the first hero frame, for the arrival move. */
  const born = useRef(-1)

  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera
    // The canvas's first frame, whatever section it lands on — so a reader who
    // arrives mid-page and scrolls back up later does not get an entrance.
    if (born.current < 0) born.current = state.clock.elapsedTime

    if (mode === 'problem') {
      problemFraming(camera, reduced ? 1 : scroll.problem, sign, state.size)
    } else if (mode === 'activation') {
      activationFraming(camera, reduced ? 1 : scroll.activation, sign, state.size)
    } else if (mode === 'series') {
      // Under reduced motion there is no rail to track; the whole section is in
      // flow and the camera holds on the first plinth.
      seriesFraming(camera, reduced ? 0 : scroll.series, sign, state.size)
    } else if (mode === 'product') {
      productFraming(camera, reduced ? 1 : scroll.product, sign, active, state.size)
    } else if (mode === 'applications') {
      applicationsFraming(camera, sign, state.size)
    } else if (mode === 'coverage') {
      coverageFraming(camera, sign, state.size)
    } else if (mode === 'about') {
      aboutFraming(camera, reduced || !isPinnedAtTier('about', tier) ? 1 : scroll.about, sign, state.size)
    } else if (mode === 'contact' || mode === 'rest') {
      // 'rest' draws nothing; holding the contact framing there means the camera
      // is already in place when the reader reaches the contact section.
      contactFraming(camera, sign, state.size)
    } else {
      // Reduced motion holds the OPENING shot: it is the one the copy is composed
      // against, and under reduced motion the copy never clears.
      const arrival = reduced
        ? 1
        : smoothstep(0, INTRO_SECONDS, state.clock.elapsedTime - born.current)
      heroFraming(camera, reduced ? 0 : scroll.hero, sign, state.size, arrival)
    }

    /**
     * Mouse parallax — a lean, not an orbit control.
     *
     * Applied to the CAMERA TARGET only, never to the look target, which is what
     * makes it a real orbit about the subject rather than a slab of the whole
     * scene sliding sideways. The section functions have already set both, so
     * nudging one of them tilts the view axis by exactly the amount below.
     *
     * Small and heavily damped is what makes this read as an expensive camera
     * rather than as a gimmick — it should be felt and not noticed, and anything
     * larger fights the screen-space anchoring that keeps the product off the
     * copy. 35 mm of lateral travel is about 2.4° of orbit at the hero's ~0.85 m.
     *
     * The display sections (LEAN_MODES) get half as much again. There the subject is
     * one object in open space, the lean is the thing that proves it is
     * three-dimensional, and there is room beside it for the frame to move without
     * the subject reaching the copy column.
     *
     * It is not damped here: it is folded into the target that camera.position
     * already damps toward at rate 4, so the lean inherits the same easing as
     * every other camera move and never snaps.
     */
    if (pointer.active && !reduced) {
      const lean = LEAN_MODES.has(mode) ? 1.5 : 1
      camTarget.x += pointer.x * POINTER_LATERAL * lean
      camTarget.y += pointer.y * POINTER_VERTICAL * lean
    }

    if (reduced) {
      camera.position.copy(camTarget)
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, camTarget.x, 4, dt)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, camTarget.y, 4, dt)
      camera.position.z = THREE.MathUtils.damp(camera.position.z, camTarget.z, 4, dt)
    }
    camera.lookAt(lookTarget)
  })


  return null
}

/**
 * Section 01. Two shots and one move between them.
 *
 * OPEN: the turntable beside the copy (split) or under it (stacked), seen from a
 * little above so the platter reads as an ellipse with its lit rim.
 * FOCUS: the unit centred, larger and from a lower angle, once the copy has
 * cleared and the DOM is naming it.
 *
 * Which layout is decided by isHeroSplit() from the same numbers as the `split:`
 * Tailwind screen, so the camera and the copy can never disagree about it.
 */
function heroFraming(
  camera: THREE.PerspectiveCamera,
  p: number,
  sign: 1 | -1,
  size: { width: number; height: number },
  /** 0 → 1 over the first seconds on the page; 1 thereafter. */
  arrival: number,
) {
  const shots = isHeroSplit(size.width, size.height) ? HERO_SHOTS.split : HERO_SHOTS.stacked
  const t = smoothstep(HERO_MOVE[0], HERO_MOVE[1], p)

  // Each end solved against the live aspect, then interpolated — so the group
  // fills its share at both ends on any viewport, not just the one it was tuned on.
  const distance = lerp(
    heroDistanceFor(HERO_GROUP, shots.open, camera.aspect),
    heroDistanceFor(HERO_GROUP, shots.focus, camera.aspect),
    t,
  )

  // The arrival: further out, higher, and swung a little round, settling into the
  // shot. Squared so it decelerates into place rather than stopping.
  const away = (1 - arrival) * (1 - arrival)

  orbitAnchor(
    camera,
    0,
    HERO_GROUP.centreY,
    distance * (1 + away * 0.55),
    lerp(shots.open.elevation, shots.focus.elevation, t) + away * 0.22,
    lerp(shots.open.azimuth, shots.focus.azimuth, t) + away * 0.5,
    lerp(shots.open.anchorX, shots.focus.anchorX, t),
    lerp(shots.open.anchorY, shots.focus.anchorY, t),
    sign,
  )
}

/**
 * Screen-space anchoring from an ORBIT rather than from a level camera.
 *
 * anchorSubject() keeps the view axis parallel to -Z, which is right for every
 * section that looks at a product side-on. The hero looks DOWN at a turntable, and
 * a level camera sees the platter edge-on as a flat band with no rim.
 *
 * Same principle, generalised: place the camera on its orbit round the subject,
 * then slide camera and look target together along the camera's own right and up
 * vectors. Sliding perpendicular to the view axis leaves the subject at the same
 * depth and moves it on screen by exactly the slide, so the anchor holds at every
 * elevation. With elevation and azimuth both 0 this is anchorSubject() exactly.
 */
function orbitAnchor(
  camera: THREE.PerspectiveCamera,
  subjectX: number,
  subjectY: number,
  distance: number,
  elevation: number,
  azimuth: number,
  anchorX: number,
  anchorY: number,
  sign: 1 | -1,
  subjectZ = 0,
) {
  const cosE = Math.cos(elevation)
  // From the camera toward the subject.
  forward.set(-Math.sin(azimuth) * cosE, -Math.sin(elevation), -Math.cos(azimuth) * cosE)
  right.set(Math.cos(azimuth), 0, -Math.sin(azimuth))
  up.crossVectors(right, forward)

  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance
  const halfWidth = halfHeight * camera.aspect
  // Positive offsetY puts the subject BELOW centre, so the camera rides up by it.
  const offsetX = (anchorX - 0.5) * 2 * halfWidth * sign
  const offsetY = (anchorY - 0.5) * 2 * halfHeight

  camTarget
    .set(subjectX, subjectY, subjectZ)
    .addScaledVector(forward, -distance)
    .addScaledVector(right, -offsetX)
    .addScaledVector(up, offsetY)
  lookTarget.copy(camTarget).addScaledVector(forward, distance)
}


/**
 * The switchgear room's shot, shared by sections 02 and 03: the whole cutaway in
 * the inline-end half of the frame (split) or under the copy (stacked), seen from
 * outside at the front-right.
 *
 * The camera used to push INTO the room and stand between the racks, which put
 * both racks and their LED columns behind the copy for the whole of section 02 —
 * the cyan LEDs ran straight through the headlines. From outside, the room is a
 * volume with a fault in it, and it keeps to its own half of the screen.
 */
const ROOM_SHOT = {
  split: { widthShare: 0.5, heightShare: 0.74, anchorX: 0.7, anchorY: 0.55 },
  stacked: { widthShare: 0.84, heightShare: 0.38, anchorX: 0.5, anchorY: 0.74 },
} as const

function roomShot(camera: THREE.PerspectiveCamera, size: { width: number; height: number }, azimuth: number, elevation: number) {
  const shot = isHeroSplit(size.width, size.height) ? ROOM_SHOT.split : ROOM_SHOT.stacked
  const { w, h, d } = ROOM_DIMENSIONS
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))
  // Projected extents from this bearing: the footprint's width across the view,
  // and the height plus the floor's depth seen from above.
  const across = w * Math.cos(azimuth) + d * Math.sin(azimuth)
  const tall = h * Math.cos(elevation) + d * Math.sin(elevation)
  const distance = Math.max(
    tall / (shot.heightShare * 2 * tanHalf),
    across / (shot.widthShare * 2 * tanHalf * camera.aspect),
  )
  return { shot, distance }
}

/**
 * Section 02. The room from outside, easing in and round a little as the fault
 * develops — the stake is built by the room going wrong, not by the camera moving.
 * No product on screen: this section exists so section 03 lands.
 */
function problemFraming(
  camera: THREE.PerspectiveCamera,
  p: number,
  sign: 1 | -1,
  size: { width: number; height: number },
) {
  const push = smoothstep(0, 1, p)
  const azimuth = lerp(0.62, 0.44, push)
  const elevation = lerp(0.24, 0.16, push)
  const { shot, distance } = roomShot(camera, size, azimuth, elevation)
  orbitAnchor(
    camera,
    0,
    ROOM_DIMENSIONS.h * 0.46,
    distance * lerp(1.14, 0.98, push),
    elevation,
    azimuth,
    shot.anchorX,
    shot.anchorY,
    sign,
  )
}

/**
 * Section 03. Opens on exactly the shot section 02 ends on, so the cut between
 * them is invisible; eases toward the bracket as the unit mounts and fires; pulls
 * back to the whole room for the flood, so it reads as filling the volume rather
 * than as a spray; then settles.
 *
 * The push is PARTIAL — the subject moves under half way to the bracket and the
 * camera stops well outside the room. It used to open 1.5 m from the bracket,
 * which stood the camera between the racks with a rack face filling the copy's
 * half of the frame and the unit itself out of shot.
 */
function activationFraming(
  camera: THREE.PerspectiveCamera,
  p: number,
  sign: 1 | -1,
  size: { width: number; height: number },
) {
  const focus = smoothstep(0, 0.22, p) * (1 - smoothstep(0.36, 0.58, p))
  const settle = smoothstep(0.62, 1, p)
  const azimuth = lerp(0.44, 0.5, focus)
  const elevation = lerp(0.16, 0.1, focus)
  const { shot, distance } = roomShot(camera, size, azimuth, elevation)

  const [mx, my, mz] = ACTIVATION_MOUNT
  // A portrait frame already has the room edge to edge; any dolly there only
  // crops it, so the phone gets no push — just a lean of the aim toward the unit.
  const stacked = shot === ROOM_SHOT.stacked
  const toward = focus * (stacked ? 0.22 : 0.36)
  orbitAnchor(
    camera,
    lerp(0, mx, toward),
    lerp(ROOM_DIMENSIONS.h * 0.46, my, toward),
    distance * (stacked ? 1 : lerp(0.98, 0.84, focus) * lerp(1, 0.96, settle)),
    elevation,
    azimuth,
    shot.anchorX,
    shot.anchorY,
    sign,
    lerp(0, mz, toward),
  )
}

/**
 * Section 04. The camera tracks sideways from plinth to plinth. Progress becomes
 * camera X through the direction sign, so the rail reads left-to-right in English
 * and right-to-left in Arabic — while the scene itself is never mirrored.
 *
 * Distance and aim are interpolated between the two plinths either side of the
 * camera, so arriving at a 300 mm row of bars and at a 700 mm row of canisters
 * both land the same way, with no jump at the midpoint. The camera also eases
 * back a little between plinths and forward again as the next one settles: a
 * travelling shot, rather than a slide.
 */
function seriesFraming(
  camera: THREE.PerspectiveCamera,
  p: number,
  sign: 1 | -1,
  size: { width: number; height: number },
) {
  const shot = isHeroSplit(size.width, size.height) ? SERIES_SHOTS.split : SERIES_SHOTS.stacked
  const s = seriesStageAt(p)
  const i0 = Math.min(Math.floor(s), SERIES_STAGES.length - 1)
  const i1 = Math.min(i0 + 1, SERIES_STAGES.length - 1)
  const f = s - i0
  const a = SERIES_STAGES[i0]
  const b = SERIES_STAGES[i1]

  const travel = 1 + Math.sin(f * Math.PI) * 0.22
  const distance =
    lerp(seriesDistanceFor(a, shot, camera.aspect), seriesDistanceFor(b, shot, camera.aspect), f) *
    travel

  orbitAnchor(
    camera,
    sign * s * STAGE_GAP,
    lerp(a.centreY, b.centreY, f),
    distance,
    shot.elevation,
    0,
    shot.anchorX,
    shot.anchorY,
    sign,
  )
}

/**
 * Section 05. One product at a time, held at the same screen anchor regardless of
 * whether it is a 115 mm bar or a 215 × 180 mm canister — the distance changes,
 * the composition does not. The camera eases back for the exploded view so the
 * separated parts stay in frame.
 */
function productFraming(
  camera: THREE.PerspectiveCamera,
  p: number,
  sign: 1 | -1,
  active: string | null,
  size: { width: number; height: number },
) {
  const explode = smoothstep(0.5, 0.72, p) * (1 - smoothstep(0.82, 0.96, p))
  const split = isHeroSplit(size.width, size.height)
  lerpFraming(PRODUCT_NEAR, PRODUCT_EXPLODED, explode, framing)

  // Stacked (phones, portrait tablets): the copy and the spec grid own the top of
  // the screen, so the product takes the free lower part, centred and smaller. At
  // 66% across a 375px screen it was drawn straight through the spec table.
  if (!split) {
    framing.anchorX = 0.5
    framing.anchorY = 0.8
  }

  // EVERY PRODUCT FILLS ITS OWN FRAME. Solved from this unit's bounding box and
  // the live viewport aspect, not from a shared world scale — see
  // productFramingFor. The exploded view needs more room on top of that, because
  // the parts separate along the axis the camera is measuring.
  const barrel = (active && BARRELS[active]) || BARRELS.sx300
  const solved = split
    ? productFramingFor(barrel.length, barrel.modelRadius, camera.aspect)
    : productFramingFor(barrel.length, barrel.modelRadius, camera.aspect, 0.26, 0.5)

  framing.distance = solved.distance * (1 + explode * 0.62)

  const f = anchorSubject(camera, 0, solved.centreY, framing, sign)
  camTarget.set(f.camX, f.camY, f.camZ)
  lookTarget.set(f.lookX, f.lookY, 0)
}

/**
 * Section 07. The camera sits at the centre of the drum looking out; the drum
 * turns past it. Screen-space anchored like §04 and §05, so an engine bay and a
 * data-centre aisle — very different volumes — both frame the same way as they
 * come round.
 */
function applicationsFraming(
  camera: THREE.PerspectiveCamera,
  sign: 1 | -1,
  size: { width: number; height: number },
) {
  // Distance and centre height are solved from the enclosure now at the front of
  // the drum, and interpolated between neighbours as it turns. A single fixed
  // distance framed a 0.5 m³ fume hood and a 15 m³ paint booth identically, which
  // means it framed neither.
  const split = isHeroSplit(size.width, size.height)
  // Stacked: the environment has the lower ~40% of a portrait frame, under the
  // copy, and must fit that frame's real width rather than a 16:9 one.
  const solved = applicationsFramingAt(
    scroll.applications,
    split ? undefined : { aspect: camera.aspect, heightShare: 0.36, widthShare: 0.86 },
  )

  // From a little above and to the front-right: into the cutaway's open front and
  // top, with the back and side walls behind what it shows.
  orbitAnchor(
    camera,
    0,
    solved.centreY,
    solved.distance * 1.08,
    0.24,
    0.42,
    split ? APPLICATIONS_FRAMING.anchorX : 0.5,
    split ? APPLICATIONS_FRAMING.anchorY : 0.72,
    sign,
  )
}

/**
 * About. The globe beside the copy column (split) or under it (stacked). It eases
 * in slightly on the company beat and back out as the arcs draw, so the whole
 * network — Riyadh to Taiwan — is in frame by the time it is complete.
 */
function aboutFraming(
  camera: THREE.PerspectiveCamera,
  p: number,
  sign: 1 | -1,
  size: { width: number; height: number },
) {
  const shot = isHeroSplit(size.width, size.height) ? GLOBE_SHOTS.split : GLOBE_SHOTS.stacked
  const push = smoothstep(0, 0.3, p) - smoothstep(0.35, 0.8, p) * 1.4
  const distance = globeDistanceFor(shot, camera.aspect) * (1 - 0.05 * push)
  orbitAnchor(camera, 0, GLOBE.centreY, distance, 0, 0, shot.anchorX, shot.anchorY, sign)
}

/**
 * Contact. The globe as a horizon: far larger than the frame and sunk below it,
 * under the contact details, with Riyadh lit on its upper edge.
 */
function contactFraming(
  camera: THREE.PerspectiveCamera,
  sign: 1 | -1,
  size: { width: number; height: number },
) {
  const shot = isHeroSplit(size.width, size.height) ? CONTACT_SHOTS.split : CONTACT_SHOTS.stacked
  const distance = globeDistanceFor(shot, camera.aspect, false)
  orbitAnchor(camera, 0, GLOBE.centreY, distance, 0, 0, shot.anchorX, shot.anchorY, sign)
}

/**
 * Section 06. A three-quarter view down into the cutaway, beside the form.
 *
 * The distance is solved from the room's diagonal, so a 0.5 m cabinet and a 50 m³
 * hall arrive at the same apparent size — the previous fixed 6.5 m framed a
 * default-sized room and nothing else. The camera eases between sizes on its own
 * damping. From the front-right, so the open front and the open top face it and
 * the back and side walls are what it looks at.
 */
function coverageFraming(
  camera: THREE.PerspectiveCamera,
  sign: 1 | -1,
  size: { width: number; height: number },
) {
  const room = useScene.getState().room
  const split = isHeroSplit(size.width, size.height)
  const diagonal = Math.hypot(room.l, room.w, room.h)
  const share = split ? 0.78 : 0.6
  const distance = diagonal / (share * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)))
  orbitAnchor(
    camera,
    0,
    room.h / 2,
    distance,
    0.42,
    0.62,
    split ? 0.74 : 0.5,
    split ? 0.54 : 0.74,
    sign,
  )
}
