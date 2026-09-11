---
name: glb-gltf-pipeline
description: Rules for producing, optimizing, validating and loading .glb/.gltf assets for the Almaghrabi/GENEFIRE web build. Use whenever a 3D model is created, exported, compressed, added to /public/models, or loaded in React Three Fiber.
---

# GLB / glTF pipeline

Every 3D asset on this site is a **.glb** (binary glTF 2.0). No .obj, .fbx, .skp or .blend
ever reaches `/public`. Those are source formats and live in `/3d-source/`, which is
git-ignored for binaries over 5 MB.

## 1. Non-negotiable conventions

| Rule | Value | Why |
|---|---|---|
| Units | **metres** | glTF spec. `PX1M` is 200 mm → `0.2` along its long axis. |
| Up axis | **+Y** | three.js is Y-up. Blender/SketchUp are Z-up — convert on export, never at runtime. |
| Forward | **-Z** | Product label faces `-Z` so the default camera sees branding with no rotation. |
| Origin | **base centre** | Bottom face of the canister sits on `y = 0`, centred on X/Z. Lets you drop a model on a floor plane and scatter instances without per-model offsets. |
| Scale | **1.0** | Never ship a model that needs `scale={0.01}` in JSX. Fix it at export. |
| Names | `genefire_<id>_<part>` | e.g. `genefire_sx300_body`, `genefire_sx300_bracket`. Lowercase, snake_case, ASCII only — Arabic or spaces in node names break some GLTF tooling. |
| Colour space | baseColor + emissive = **sRGB**; normal / roughness / metallic / AO = **linear** | Wrong space is the #1 cause of "why is my red muddy". Under **R3F v9 the automatic sRGB conversion of texture props was removed** — GLTFLoader still tags textures from a `.glb` correctly, but any custom material must annotate its colour textures manually (`tex.colorSpace = THREE.SRGBColorSpace`). On React 19 this is the muddy-red failure mode. |

## 2. Materials

Author PBR metallic-roughness only. The five materials in this project:

```
GF_RedAnodized   baseColor #E1251B  metallic 0.75  roughness 0.32
GF_RedPolymer    baseColor #DA1E16  metallic 0.05  roughness 0.42
GF_Stainless     baseColor #C7CACE  metallic 1.00  roughness 0.28
GF_BlackPolymer  baseColor #0E0F10  metallic 0.05  roughness 0.55
GF_Bracket       baseColor #B8BCC0  metallic 1.00  roughness 0.35
```

Reuse these exact names across every model. Identical material names let three.js share
programs and cut compile stalls on first scroll.

Anodized aluminium is **not** a dielectric — keep metallic high and let roughness do the
work. If red reads pink, you have double sRGB conversion, not a wrong hex.

## 3. Optimization — run this before every commit

`gltf-transform` is the tool. Install once: `npm i -D @gltf-transform/cli`

```bash
# Standard product model (small, hero, needs crisp silhouette)
npx gltf-transform optimize in.glb out.glb \
  --compress meshopt \
  --texture-compress webp \
  --texture-size 1024 \
  --simplify false

# Heavy/background model (cutaway room, server rack, factory prop)
npx gltf-transform optimize in.glb out.glb \
  --compress draco \
  --texture-compress ktx2 \
  --texture-size 2048 \
  --simplify true --simplify-error 0.001
```

**meshopt vs draco — pick deliberately:**

- **meshopt** decodes an order of magnitude faster and the decoder is ~15 KB. Use it for
  anything the user sees in the first viewport, and for anything that streams in during a
  scroll. Slightly larger files, far better time-to-first-frame.
- **draco** compresses harder (up to ~10× on geometry) but the decoder is ~200 KB WASM and
  decode is slow enough to hitch a scroll. Use only for models loaded lazily, well below
  the fold.
- Never apply both to the same file.

**KTX2 / Basis** textures upload to the GPU compressed, so they cost roughly a quarter of
the VRAM of a PNG and never spike memory during decode. Use them for anything ≥ 1024 px.
Below that, WebP is simpler and fine.

## 4. Budgets for this site

| | Target | Hard ceiling |
|---|---|---|
| Single product .glb | ≤ 150 KB | 400 KB |
| All models on one route | ≤ 1.2 MB | 2 MB |
| Triangles per product | ≤ 12 k | 25 k |
| Draw calls per frame | ≤ 60 | 120 |
| Distinct materials in scene | ≤ 8 | 15 |
| Textures resident | ≤ 6 | 12 |

The 11 parametric placeholder models in `assets/products/` total **~256 KB combined**. Any
replacement authored in Blender or converted from SketchUp must be measured against that,
not against how it looks in the viewport.

## 5. Validation gate

A model is not "done" until all four pass:

```bash
npx gltf-transform inspect model.glb        # 1. meshes, materials, textures, extensions
npx gltf-validator model.glb                # 2. spec compliance, zero errors
```
3. Loads in <https://gltf-viewer.donmccurdy.com/> with correct orientation and scale.
4. `console.log(scene)` in the app shows the expected node names and no `Object_1` junk.

Common failures and what they actually mean:

- **Model invisible** — usually scale (imported in mm so it's 1000× too big and the camera is inside it), or normals flipped by a mirrored modifier that was never applied.
- **Black model** — no lights and no environment map. `<Environment preset="warehouse" />` first, then debug materials.
- **Washed-out / neon colours** — `renderer.outputColorSpace` mismatch, or texture flagged sRGB twice.
- **Seams on smooth cylinders** — split vertices from a UV seam; weld before export or accept the extra verts.
- **Long white flash on load** — shader compile stall. Warm it: render one frame of every material off-screen during the loader, or use `<Preload all />`.

## 6. Loading in R3F

```jsx
import { useGLTF } from '@react-three/drei'

// Preload at module scope — starts the fetch before React mounts the component
useGLTF.preload('/models/sx300.glb')

export function SX300(props) {
  const { nodes, materials } = useGLTF('/models/sx300.glb')
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.genefire_sx300_body.geometry}    material={materials.GF_Stainless} />
      <mesh geometry={nodes.genefire_sx300_bracket.geometry} material={materials.GF_Bracket} />
    </group>
  )
}
```

Generate typed components with `npx gltfjsx model.glb --types --transform` rather than
hand-writing them. `--transform` runs the optimizer as a side effect; check the output size
before accepting it.

Set the decoder paths once, at app root:

```js
useGLTF.setDecoderPath('/draco/')      // only if any model uses draco
// meshopt decoder ships with drei and needs no setup
```

Host the draco decoder locally in `/public/draco/` — do not point at a CDN, it is a
render-blocking third-party dependency on a Saudi-hosted marketing site.

## 7. When there is no real model yet

Ship the parametric placeholder from `assets/products/<id>.glb`. It carries the correct
published dimensions, so layout, camera framing and scroll timing built against it stay
valid when the real scan or CAD arrives. Swap the file, keep the node names, and nothing in
the scene graph changes.
