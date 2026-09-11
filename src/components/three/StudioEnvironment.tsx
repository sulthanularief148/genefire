'use client'

import { Environment, Lightformer } from '@react-three/drei'

/**
 * The studio environment.
 *
 * The products are 60% anodized aluminium and 40% brushed stainless. Both are
 * metals, so with metalness near 1 they are mirrors: the environment map does
 * almost all of the lighting work and the punctual lights only shape it.
 *
 * DEVIATION, deliberate — the build spec calls for a 1k studio HDR at
 * /hdr/studio_soft_1k.hdr. No such file exists in the kit, and the two ways to
 * get one are both worse than this:
 *
 *   - drei's <Environment preset="studio"> fetches from a pmndrs CDN. That is a
 *     render-blocking third-party dependency on a Saudi-hosted marketing site,
 *     which is exactly the reason the glb pipeline skill bans the draco decoder
 *     CDN.
 *   - Inventing an .hdr file would put an unreviewed binary in /public.
 *
 * So the rig is authored here as lightformers: a large soft key above and in
 * front, two side cards for the cylindrical falloff that sells a curved metal
 * surface, and a dim cool card behind for edge separation. It bakes once
 * (frames={1}) into a 256px PMREM and costs zero network bytes, which also keeps
 * the first-viewport budget clean.
 *
 * To switch to a real HDR when the client supplies one: drop the file in
 * public/hdr/ and replace the whole <Environment> below with
 *   <Environment files="/hdr/studio_soft_1k.hdr" environmentIntensity={0.9} />
 * Nothing else in the scene changes.
 */
export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={1.15}>
      {/*
        The world the metals reflect.

        RAISED from #08090b. This is the environment scene, not the page ground,
        and matching the two was the mistake: GF_Stainless is metalness 1.0, so it
        has no diffuse term at all and every photon it shows is a reflection of
        this colour. Against near-black the SX canisters rendered as black
        cylinders with a blue rim — which is the "blue-grey, not red" complaint,
        the half that was not the sRGB baseColorFactor bug.

        assets/photos/sx300.png and sx1500.png show what these actually are:
        bright brushed stainless, shot light. The stage materials are unaffected
        because they damp the environment themselves — the §07 enclosures sit at
        envMapIntensity 0.12 and the §02 room at 0.14, while the products take it
        at full strength. Lifting this lights the actors and not the set.
      */}
      <color attach="background" args={['#3a3f47']} />

      {/* Key — a broad softbox high and in front. This is the highlight that runs
          down the length of a canister.

          ENLARGED AND RAISED from 3.4 / 4x2.4. At metalness 1 the stainless is a
          mirror, and a mirror in a room that is 95% #08090b reflects almost
          nothing — the industrial canisters were reading as near-black with a
          blue rim, which is the other half of "the products look blue-grey". The
          answer for a cylinder is a bigger source, not a brighter one: this now
          subtends enough angle to sweep a continuous highlight down the barrel
          instead of catching one hot line. */}
      <Lightformer
        form="rect"
        intensity={5}
        position={[0, 2.2, 1.6]}
        rotation={[-0.5, 0, 0]}
        scale={[6, 3, 1]}
      />

      {/* Side cards. A cylinder needs light from both flanks or it reads as a flat
          disc — these produce the two vertical highlights on the barrel. */}
      <Lightformer
        form="rect"
        intensity={1.5}
        position={[2.6, 0.9, 0.6]}
        rotation={[0, -Math.PI / 2.4, 0]}
        scale={[3, 2, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.1}
        position={[-2.6, 0.9, 0.6]}
        rotation={[0, Math.PI / 2.4, 0]}
        scale={[3, 2, 1]}
      />

      {/* Cool back card — separates the silhouette from the void without lifting
          the overall exposure.

          DIMMED AND DESATURATED from 0.9 / #8FB6FF. Against a near-black world it
          was not a rim light, it was the brightest thing the stainless had to
          reflect, so it tinted the whole body blue rather than just the edge. */}
      <Lightformer
        form="rect"
        intensity={0.55}
        color="#A9C4E8"
        position={[0, 1.4, -2.6]}
        rotation={[0.4, 0, 0]}
        scale={[4, 2, 1]}
      />

      {/* A dim floor bounce so the underside of a bracket is not pure black. */}
      <Lightformer
        form="rect"
        intensity={0.6}
        position={[0, -1.6, 0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[4, 4, 1]}
      />
    </Environment>
  )
}
