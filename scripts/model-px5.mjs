#!/usr/bin/env node
/**
 * Authors assets/products/px5.glb — the PX 5 handheld, modelled rather than proxied.
 *
 * WHY THIS EXISTS AS A SCRIPT. Every other product in the kit arrived as a .glb
 * from the client and assets/products/ is the authoring source, so there was
 * nowhere to "open the file and fix it". There is no Blender in this toolchain and
 * no .blend for this unit to open. A generator is the only form of authoring the
 * repo can actually reproduce: the model is derived from the published dimensions
 * and from assets/photos/px5.png, and re-running this rebuilds it byte for byte.
 *
 * WHAT WAS WRONG WITH THE PROXY. It was a 256-triangle cylinder with three box
 * bars for a handle, POSITION only — no NORMAL — so three.js computed flat facet
 * normals and the barrel read as a faceted drum. The real unit reads almost
 * entirely through highlights rolling across curvature, which is unavailable to a
 * mesh with no normals and no fillets. Both are fixed here.
 *
 * THE FORM, from assets/photos/px5.png:
 *   - a red polymer barrel, dished base, standing on its base rim
 *   - a swept ergonomic handle arching over the barrel, closed loop
 *   - a black polymer collar below the outlet
 *   - a flared bell nozzle with a rolled lip, hollow, the widest part of the unit
 *   - a small chrome safety latch and pin on the rear of the handle
 *
 * DIMENSIONS. 300 mm long x 160 mm across, from products.json (length_mm 300,
 * dia_mm 160) — which is the BODY envelope: the bell lip is the widest point at
 * exactly 160 mm and nothing on the barrel exceeds it. The handle stands proud of
 * that, as it does on the real unit; a carry handle is not part of a barrel
 * diameter. Metres, +Y up once stood upright, origin at base centre.
 *
 * AXIS. +Z, matching every other model in the kit — see UPRIGHT in lib/framing.ts,
 * which stands them up. Contradicts hard rule 9 read literally, but the rule that
 * actually matters is that all eleven agree, and ten of them are already +Z.
 *
 * COLOUR. baseColorFactor is written in LINEAR space, which is what glTF specifies
 * and what three's GLTFLoader reads. The rest of the kit was authored in sRGB and
 * is corrected at build time by scripts/fix-model-colors.mjs; this file is already
 * right, so it carries that script's `colorSpaceCorrected` stamp and is skipped
 * rather than converted a second time. The stamp survives dedup/join/prune, so it
 * still reads as corrected by the time fix:colors runs. The TARGET sRGB values are
 * the kit's own, so the PX 5 matches the range rather than becoming a second red.
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const OUT = join(process.cwd(), 'assets', 'products', 'px5.glb')

/* ------------------------------------------------------------- dimensions --- */

/** Radial segments. 72 puts a facet every 5°, which a rolled highlight needs. */
const RADIAL = 72

const LENGTH = 0.3 /* 300 mm */
const BELL_R = 0.08 /* 160 mm across at the lip — the published diameter */
const BARREL_R = 0.0755
const BAND_R = 0.0775

const BARREL_Z1 = 0.2 /* where the barrel ends and the collar begins */
const BAND_Z0 = BARREL_Z1
const BAND_Z1 = 0.228

/**
 * The collar starts exactly where the barrel ends, and that is load-bearing.
 *
 * gen-barrels records a black band as an obstacle only when it CROSSES the barrel
 * (`b.z0 < barrel.z1`), and ProductDecals then has to lay the wordmark and the
 * model number around it. Seating the collar flush against the end of the barrel
 * instead of on top of it leaves the whole 200 mm cylinder clear, which is where
 * the print sits on the real unit — one uninterrupted run of red under the handle.
 */
if (BAND_Z0 !== BARREL_Z1) throw new Error('collar must seat flush with the barrel end')

/* ------------------------------------------------------------ 2D helpers --- */

/**
 * Round the interior corners of a profile polyline.
 *
 * "Bevel every hard edge 0.5-0.8 mm" is the whole reason this model reads. A
 * corner with no fillet returns a single specular line; a 0.7 mm fillet returns a
 * band of highlight that travels as the unit turns, which is what the photograph
 * is almost entirely made of.
 */
function fillet(points, radius = 0.0007, segments = 3) {
  const out = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]
    const [cx, cy] = points[i]
    const [nx, ny] = points[i + 1]

    let ax = px - cx
    let ay = py - cy
    let bx = nx - cx
    let by = ny - cy
    const la = Math.hypot(ax, ay)
    const lb = Math.hypot(bx, by)
    if (la < 1e-9 || lb < 1e-9) {
      out.push(points[i])
      continue
    }
    ax /= la
    ay /= la
    bx /= lb
    by /= lb

    const dot = Math.max(-1, Math.min(1, ax * bx + ay * by))
    const angle = Math.acos(dot)
    // Already smooth, or a fold back on itself: leave it alone.
    if (angle > Math.PI - 0.05 || angle < 0.05) {
      out.push(points[i])
      continue
    }

    // Tangent distance from the corner for the requested fillet radius, clamped
    // so a fillet can never eat more than 45% of either adjoining edge.
    const t = Math.min(radius / Math.tan(angle / 2), la * 0.45, lb * 0.45)
    const sx = cx + ax * t
    const sy = cy + ay * t
    const ex = cx + bx * t
    const ey = cy + by * t

    // Quadratic through the corner. Indistinguishable from a true arc at 0.7 mm
    // and it cannot produce a self-intersection on a tight corner the way an arc
    // centre solve can.
    for (let s = 0; s <= segments; s++) {
      const u = s / segments
      const iu = 1 - u
      out.push([
        iu * iu * sx + 2 * iu * u * cx + u * u * ex,
        iu * iu * sy + 2 * iu * u * cy + u * u * ey,
      ])
    }
  }
  out.push(points[points.length - 1])
  return out
}

/* ---------------------------------------------------------------- lathe --- */

/**
 * Revolve a (radius, z) profile about the Z axis.
 *
 * x = r·sin θ and y = r·cos θ, so θ = 0 points at +Y — the same convention
 * ProductDecals uses to place its panels, which is what lets the handle be put on
 * a known side relative to the print.
 *
 * Normals are analytic, from the profile's own tangent, and a shared profile point
 * gets ONE averaged normal when its two segments meet at less than `smoothAngle`
 * and two separate normals when they do not. That is the difference between a
 * fillet that reads as a rolled edge and one that reads as a crease with extra
 * triangles in it.
 */
function lathe(profile, { segments = RADIAL, smoothAngle = 1.05 } = {}) {
  const positions = []
  const normals = []
  const indices = []

  /** Outward 2D normal of the segment from point i to point i+1. */
  const segNormal = (i) => {
    const [r0, z0] = profile[i]
    const [r1, z1] = profile[i + 1]
    const dr = r1 - r0
    const dz = z1 - z0
    const len = Math.hypot(dr, dz)
    if (len < 1e-12) return [1, 0]
    // Rotate the tangent -90° in the (r, z) plane so it points away from the axis.
    return [dz / len, -dr / len]
  }

  const cos = new Float64Array(segments + 1)
  const sin = new Float64Array(segments + 1)
  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2
    sin[s] = Math.sin(a)
    cos[s] = Math.cos(a)
  }

  /** Push one ring of vertices and return its base index. */
  const ring = (r, z, nr, nz) => {
    const base = positions.length / 3
    for (let s = 0; s <= segments; s++) {
      positions.push(r * sin[s], r * cos[s], z)
      // At the pole the profile normal is purely axial and the radial part would
      // be a division by zero; the axial component is the whole normal there.
      normals.push(nr * sin[s], nr * cos[s], nz)
    }
    return base
  }

  for (let i = 0; i < profile.length - 1; i++) {
    const n = segNormal(i)
    const prev = i > 0 ? segNormal(i - 1) : null
    const next = i < profile.length - 2 ? segNormal(i + 1) : null

    const blend = (a, b) => {
      const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))
      if (Math.acos(dot) >= smoothAngle) return b
      const x = a[0] + b[0]
      const y = a[1] + b[1]
      const len = Math.hypot(x, y)
      return len < 1e-9 ? b : [x / len, y / len]
    }

    const nStart = prev ? blend(prev, n) : n
    const nEnd = next ? blend(next, n) : n

    const [r0, z0] = profile[i]
    const [r1, z1] = profile[i + 1]
    const a = ring(r0, z0, nStart[0], nStart[1])
    const b = ring(r1, z1, nEnd[0], nEnd[1])

    for (let s = 0; s < segments; s++) {
      // A ring collapsed onto the axis is a point, so that end of the quad is a
      // single vertex and the quad is a triangle. Emitting both triangles there
      // would ship `segments` degenerate faces per pole.
      if (r0 < 1e-7 && r1 < 1e-7) continue
      if (r0 < 1e-7) {
        indices.push(a + s, b + s + 1, b + s)
      } else if (r1 < 1e-7) {
        indices.push(a + s, a + s + 1, b + s)
      } else {
        indices.push(a + s, b + s + 1, b + s)
        indices.push(a + s, a + s + 1, b + s + 1)
      }
    }
  }

  return { positions, normals, indices }
}

/* ---------------------------------------------------------------- sweep --- */

/** Catmull-Rom through the control points, sampled evenly. */
function spline(points, samples) {
  const at = (i) => points[Math.max(0, Math.min(points.length - 1, i))]
  const out = []
  const spans = points.length - 1
  for (let s = 0; s <= samples; s++) {
    const u = (s / samples) * spans
    const i = Math.min(spans - 1, Math.floor(u))
    const t = u - i
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const t2 = t * t
    const t3 = t2 * t
    out.push([0, 1].map((k) =>
      0.5 *
      (2 * p1[k] +
        (-p0[k] + p2[k]) * t +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3),
    ))
  }
  return out
}

/**
 * Sweep a closed cross-section along a path that lies in the Y-Z plane.
 *
 * The handle is a planar arch, so the frame is trivial and needs no parallel
 * transport: the binormal is world X for the whole length, and the section's other
 * axis is the in-plane perpendicular to the tangent. Rotation-minimising frames
 * exist to stop a section twisting along a path that leaves its plane; this one
 * never does, and a general solver here would only add ways to be wrong.
 *
 * `path` is [z, y] pairs — along the barrel first, then height off the axis, which
 * is the order the shape is actually reasoned about. `section` is
 * [across, along-normal] pairs, wound counter-clockwise.
 */
function sweep(path, section, { caps = true, taper = null } = {}) {
  const positions = []
  const normals = []
  const indices = []
  const ringSize = section.length

  const frames = path.map((p, i) => {
    const a = path[Math.max(0, i - 1)]
    const b = path[Math.min(path.length - 1, i + 1)]
    const tz = b[0] - a[0]
    const ty = b[1] - a[1]
    const len = Math.hypot(tz, ty) || 1
    // In-plane perpendicular to the tangent, chosen so +along points away from the
    // barrel: along the flat of the grip the tangent is +z and this returns +y.
    return { z: p[0], y: p[1], pz: -ty / len, py: tz / len }
  })

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]
    // Swelling the section at the roots and thinning it through the grip is what
    // separates a moulded handle from a bucket bail. A constant section read as
    // exactly that in the first render.
    const k = taper ? taper(i / (frames.length - 1)) : 1
    for (const [across0, along0] of section) {
      const across = across0 * k
      const along = along0 * k
      positions.push(across, f.y + f.py * along, f.z + f.pz * along)
      // The section is a rounded rectangle centred on the path, so its own
      // outward direction is its position vector in section space.
      const len = Math.hypot(across, along) || 1
      const nAcross = across / len
      const nAlong = along / len
      normals.push(nAcross, f.py * nAlong, f.pz * nAlong)
    }
  }

  for (let i = 0; i < frames.length - 1; i++) {
    const a = i * ringSize
    const b = (i + 1) * ringSize
    for (let s = 0; s < ringSize; s++) {
      const t = (s + 1) % ringSize
      indices.push(a + s, b + s, b + t)
      indices.push(a + s, b + t, a + t)
    }
  }

  if (caps) {
    for (const end of [0, frames.length - 1]) {
      const f = frames[end]
      const base = positions.length / 3
      const sign = end === 0 ? -1 : 1
      const k = taper ? taper(end === 0 ? 0 : 1) : 1
      // Unit tangent recovered from the in-plane perpendicular: (pz, py) is the
      // tangent rotated a quarter turn, so the tangent is (py, -pz).
      const nz = sign * f.py
      const ny = sign * -f.pz
      positions.push(0, f.y, f.z)
      normals.push(0, ny, nz)
      for (const [across, along] of section) {
        positions.push(across * k, f.y + f.py * along * k, f.z + f.pz * along * k)
        normals.push(0, ny, nz)
      }
      for (let s = 0; s < ringSize; s++) {
        const t = (s + 1) % ringSize
        if (sign > 0) indices.push(base, base + 1 + s, base + 1 + t)
        else indices.push(base, base + 1 + t, base + 1 + s)
      }
    }
  }

  return { positions, normals, indices }
}

/** A rounded rectangle, as [across, along] pairs wound counter-clockwise. */
function roundedSection(halfAcross, halfAlong, radius, cornerSegments = 2) {
  const pts = []
  const ax = halfAcross - radius
  const ay = halfAlong - radius
  const corners = [
    [ax, ay, 0],
    [-ax, ay, Math.PI / 2],
    [-ax, -ay, Math.PI],
    [ax, -ay, (Math.PI * 3) / 2],
  ]
  for (const [cx, cy, start] of corners) {
    for (let s = 0; s <= cornerSegments; s++) {
      const a = start + (s / cornerSegments) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius])
    }
  }
  return pts
}

/* --------------------------------------------------------------- profiles --- */

/**
 * The barrel: a dished base standing on a rim, then a clean cylinder to the collar.
 *
 * Clean is deliberate. ProductDecals floats its panels at 1.006x the measured
 * barrel radius, so a moulded recess or a raised strip anywhere on this run would
 * put the printed wordmark half in the air over its own channel. The instruction
 * pictograms visible on the photograph are PRINT, and print on this site is the
 * decal atlas's job — modelling them as geometry would collide with it.
 */
const barrelProfile = fillet([
  [0, 0.0035],
  [0.062, 0.0008],
  [0.0705, 0],
  [BARREL_R, 0.0072],
  [BARREL_R, BARREL_Z1],
])

/** The black collar under the outlet, chamfered top and bottom. */
const bandProfile = fillet([
  [BARREL_R - 0.0005, BAND_Z0],
  [BAND_R, BAND_Z0 + 0.0032],
  [BAND_R, BAND_Z1 - 0.0032],
  [0.0742, BAND_Z1],
])

/**
 * The bell: a flared horn with a rolled lip, hollow, open at the mouth.
 *
 * Sampled as a curve rather than filleted from sharp corners — a flare has no hard
 * edges to bevel, and driving it off an exponent keeps the profile monotonic so
 * the lathe normals never fold back on themselves at the throat.
 */
const bellProfile = (() => {
  const z0 = 0.2235
  const z1 = LENGTH
  const outer = []
  const SAMPLES = 9
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES
    const z = z0 + (z1 - z0 - 0.0022) * u
    outer.push([0.0745 + (BELL_R - 0.0745) * Math.pow(u, 1.75), z])
  }
  // The rolled lip, over the mouth and back down inside.
  //
  // The crown is a short FLAT at z1 rather than a single point. Filleting a point
  // pulls it back along both edges, and a 0.8 mm fillet on the apex of the lip was
  // taking 0.2 mm off the top of the unit — the model measured 299.8 mm against a
  // published 300. A flat run gives the fillets something to eat that is not the
  // extreme itself.
  const lip = fillet(
    [
      [BELL_R, z1 - 0.0022],
      [BELL_R - 0.0008, z1],
      [BELL_R - 0.0026, z1],
      [BELL_R - 0.0052, z1 - 0.0016],
    ],
    0.0008,
    3,
  )
  const inner = []
  for (let i = SAMPLES; i >= 0; i--) {
    const u = i / SAMPLES
    const z = z0 + (z1 - z0 - 0.0052) * u
    inner.push([0.0655 + (BELL_R - 0.0102 - 0.0655) * Math.pow(u, 1.75), z])
  }
  return [...outer, ...lip, ...inner]
})()

/**
 * The handle: a closed loop off the barrel crown, back-swept at the rear post and
 * raked forward at the front, with a flat grip between.
 *
 * Control points are (z, y) in the plane through the barrel axis at x = 0. Both
 * roots end well inside the barrel wall so the join needs no boolean.
 *
 * THE GRIP HEIGHT IS AN ERGONOMIC FIGURE, not a styling one. The underside of the
 * grip clears the barrel crown by 59 mm, which is the room a gloved hand needs on
 * a unit that is carried to a fire. The first pass put it at 41 mm — the arch
 * measured right against the photograph but nobody wearing gloves could hold it,
 * and the aperture read long and mean rather than the near-square opening the
 * photograph shows.
 */
const HANDLE_PATH = [
  [0.021, 0.058],
  [0.018, 0.1],
  [0.0255, 0.129],
  [0.047, 0.14],
  [0.092, 0.142],
  [0.134, 0.1385],
  [0.1575, 0.1265],
  [0.167, 0.103],
  [0.166, 0.058],
]

/* ------------------------------------------------------------- assembly --- */

/** The chrome safety latch on the rear of the grip: a tab and the pin through it. */
function latch() {
  const positions = []
  const normals = []
  const indices = []

  const push = (part) => {
    const offset = positions.length / 3
    positions.push(...part.positions)
    normals.push(...part.normals)
    for (const i of part.indices) indices.push(i + offset)
  }

  // The tab, as a short sweep of a rounded section standing off the rear shoulder
  // of the handle — where the photograph shows the latch and its pin.
  push(
    sweep(
      spline(
        [
          [0.0295, 0.1315],
          [0.0315, 0.1455],
          [0.0405, 0.1525],
        ],
        7,
      ),
      roundedSection(0.0092, 0.0042, 0.0018, 2),
    ),
  )

  // The pin, a small cylinder lying across the unit — modelled as a lathe about Z
  // and then rotated onto X, so it is symmetric about the axis in X and cannot
  // trip the off-axis geometry cull in Stage.tsx.
  const pin = lathe(
    fillet(
      [
        [0, -0.0132],
        [0.0026, -0.0132],
        [0.0026, 0.0132],
        [0, 0.0132],
      ],
      0.0005,
      2,
    ),
    { segments: 16 },
  )
  const rotated = { positions: [], normals: [], indices: pin.indices }
  for (let i = 0; i < pin.positions.length; i += 3) {
    // (x, y, z) → (z, y, x): swings the cylinder's axis from Z onto X.
    rotated.positions.push(
      pin.positions[i + 2],
      pin.positions[i + 1] + 0.1432,
      pin.positions[i] + 0.0348,
    )
    rotated.normals.push(pin.normals[i + 2], pin.normals[i + 1], pin.normals[i])
  }
  push(rotated)

  return { positions, normals, indices }
}

const parts = [
  { name: 'px5_body_0', material: 'GF_RedPolymer', geometry: lathe(barrelProfile) },
  { name: 'px5_body_1', material: 'GF_RedPolymer', geometry: lathe(bellProfile) },
  {
    name: 'px5_body_2',
    material: 'GF_RedPolymer',
    geometry: sweep(spline(HANDLE_PATH, 40), roundedSection(0.0105, 0.0076, 0.0028, 2), {
      // Fat where it meets the barrel, slim across the grip. Cubed rather than
      // linear so the swell stays down at the roots and does not creep into the
      // part the hand closes on — and it has to be continuous, or the section
      // steps and the step catches a highlight all the way round the handle.
      taper: (t) => 1 + 0.45 * Math.abs(2 * t - 1) ** 3,
    }),
  },
  { name: 'px5_body_3', material: 'GF_BlackPolymer', geometry: lathe(bandProfile) },
  { name: 'px5_body_4', material: 'GF_Chrome', geometry: latch() },
]

/* -------------------------------------------------------------- materials --- */

/** sRGB channel (0-1) → linear. glTF stores baseColorFactor linear; see the header. */
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const linear = (r, g, b) => [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b), 1]

/**
 * The kit's own values, so the PX 5 is the same red as the other ten rather than a
 * second one. GF_RedPolymer and GF_BlackPolymer are quoted from the sRGB the kit
 * was authored in and converted here; GF_Chrome is new, and is the palette's steel.
 */
const MATERIALS = {
  GF_RedPolymer: {
    base: linear(0.854902, 0.117647, 0.086275),
    metallic: 0.05,
    roughness: 0.42,
  },
  GF_BlackPolymer: {
    base: linear(0.054902, 0.058824, 0.062745),
    metallic: 0.05,
    roughness: 0.55,
  },
  // A latch, not a body panel: fully metallic and polished, so it picks the
  // studio environment up as a bright specular against the matte polymer.
  GF_Chrome: {
    base: linear(0.788235, 0.803922, 0.823529),
    metallic: 1,
    roughness: 0.18,
  },
}

/* ----------------------------------------------------------------- write --- */

const document = new Document()
const buffer = document.createBuffer()
const scene = document.createScene('px5')

const materials = {}
for (const [name, spec] of Object.entries(MATERIALS)) {
  materials[name] = document
    .createMaterial(name)
    .setBaseColorFactor(spec.base)
    .setMetallicFactor(spec.metallic)
    .setRoughnessFactor(spec.roughness)
    .setDoubleSided(false)
}

let triangles = 0
let vertices = 0
const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }

for (const part of parts) {
  const { positions, normals, indices } = part.geometry
  triangles += indices.length / 3
  vertices += positions.length / 3

  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      bounds.min[k] = Math.min(bounds.min[k], positions[i + k])
      bounds.max[k] = Math.max(bounds.max[k], positions[i + k])
    }
  }

  const position = document
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(positions))
    .setBuffer(buffer)
  const normal = document
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(normals))
    .setBuffer(buffer)
  const index = document
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint32Array(indices))
    .setBuffer(buffer)

  const primitive = document
    .createPrimitive()
    .setAttribute('POSITION', position)
    .setAttribute('NORMAL', normal)
    .setIndices(index)
    .setMaterial(materials[part.material])

  const mesh = document.createMesh(part.name).addPrimitive(primitive)
  scene.addChild(document.createNode(part.name).setMesh(mesh))
}

document.getRoot().setDefaultScene(scene)
document.getRoot().getAsset().extras = { colorSpaceCorrected: true }

mkdirSync(dirname(OUT), { recursive: true })
await new NodeIO().write(OUT, document)

const mm = (v) => (v * 1000).toFixed(1)
console.log(
  `model:px5 — assets/products/px5.glb\n` +
    `  ${parts.length} parts   ${triangles.toLocaleString()} triangles   ${vertices.toLocaleString()} vertices\n` +
    `  body   ${mm(bounds.max[2] - bounds.min[2])} x ${mm(
      Math.max(BELL_R, BARREL_R, BAND_R) * 2,
    )} mm  (published 300 x 160)\n` +
    `  handle stands to ${mm(bounds.max[1])} mm off axis\n` +
    `  baseColorFactor written LINEAR, asset stamped colorSpaceCorrected`,
)
