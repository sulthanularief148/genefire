/**
 * The About section's globe: where the GENEFIRE network sits, and how the section
 * moves through it.
 *
 * Its own module because the server-rendered About section (beats, node list), the
 * globe (positions) and the camera rig (framing) all need it, and none of them
 * should import another. No 'use client', no three.js — hard rule 11.
 *
 * WHAT IS ON THE MAP, AND ON WHAT AUTHORITY. Hard rule 3: nothing here is invented.
 *
 *   ALMAGHRABI, Riyadh — the brochure: "Authorized agent in Saudi Arabia", Othman
 *     Bin Affan Road, Al Nuzha District. A city, so a city's coordinates.
 *   GENEFIRE, Taiwan — GENEFIRE's own site identifies the brand with Taiwan in its
 *     page titles. No city is published, so the marker sits on the island's centre
 *     and the label says the country, not a city. TO CONFIRM with the client.
 *   GeneFire India — GENEFIRE's India account (instagram.com/genefireindia). No
 *     city is published; the marker is on the country's centre. TO CONFIRM.
 *
 * The arcs run from the brand to each of its presences. They say "GENEFIRE is
 * represented here", which is what the sources support — not a supply route, not an
 * exclusivity, and not any relationship between India and Saudi Arabia.
 *
 * See docs/LAUNCH-CHECKLIST.md for what still needs the client's sign-off.
 */

export type NetworkNodeId = 'genefire' | 'india' | 'almaghrabi'

export interface NetworkNode {
  id: NetworkNodeId
  /** Degrees, north positive. */
  lat: number
  /** Degrees, east positive. */
  lon: number
  /** Riyadh is where the reader is being brought; it is drawn as the brightest. */
  home?: boolean
}

export const NETWORK_NODES: NetworkNode[] = [
  { id: 'genefire', lat: 23.7, lon: 121.0 },
  { id: 'india', lat: 22.6, lon: 79.0 },
  { id: 'almaghrabi', lat: 24.7136, lon: 46.6753, home: true },
]

/** From the brand to each presence. */
export const NETWORK_ARCS: ReadonlyArray<readonly [NetworkNodeId, NetworkNodeId]> = [
  ['genefire', 'india'],
  ['genefire', 'almaghrabi'],
]

/** Globe radius, metres, and where its centre sits in the world. */
export const GLOBE = { radius: 0.62, centreY: 1.1 } as const

/**
 * Copy beats, shared with PinnedSection.
 *
 *   beat 0  (0 – 0.45)  who we are — the company, GENEFIRE, the range in figures
 *   beat 1  (0.45 – 1)  the network — the arcs draw, the three presences, features
 */
export const ABOUT_BEATS = [0.45] as const

/** Where the arcs draw, in section progress. Brand → India first, then → Riyadh. */
export const ARC_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [0.4, 0.62],
  [0.52, 0.76],
]

/**
 * A point on the unit sphere from latitude and longitude, in the globe's own frame:
 * +Y is north, and longitude 0 faces +Z — the camera — before the globe is turned.
 */
export function latLonToUnit(lat: number, lon: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180
  const lambda = (lon * Math.PI) / 180
  return [Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda)]
}

/**
 * Point `i` of the Fibonacci lattice the land mask was baked against — the SAME
 * formula as scripts/gen-globe.mjs. Change one and the continents scramble.
 */
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
export function fibonacciPoint(i: number, count: number): [number, number, number] {
  const y = 1 - ((i + 0.5) / count) * 2
  const r = Math.sqrt(1 - y * y)
  const theta = i * GOLDEN
  return [Math.cos(theta) * r, y, Math.sin(theta) * r]
}

/**
 * The globe's turn, as [tilt about X, turn about Y] in radians, that brings a given
 * latitude and longitude to face the camera. Applied as Euler 'XYZ', which
 * composes Rx·Ry: the turn about the pole happens first, then the tilt.
 */
export function faceTowards(lat: number, lon: number): [number, number] {
  return [(lat * Math.PI) / 180, (-lon * Math.PI) / 180]
}

/**
 * The region the network occupies — between Riyadh and Taiwan — which the globe
 * turns to face once the arcs are drawing. A little south of the nodes' mean
 * latitude so the northern hemisphere's land mass does not crowd the top of the
 * frame.
 */
export const NETWORK_FOCUS = { lat: 18, lon: 84 } as const

/** Where the globe starts: Riyadh facing the reader, with the brand to its east. */
export const HOME_FOCUS = { lat: 22, lon: 62 } as const

/** One camera shot of the globe. */
export interface GlobeShot {
  /** Share of the frame height the globe's diameter fills. */
  heightShare: number
  /** Fraction of width from the INLINE-START edge. */
  anchorX: number
  anchorY: number
}

/**
 * SPLIT: beside the copy column, as the hero and the series do it. Large, but the
 * WHOLE of the network has to be in frame: the first cut ran the globe past the
 * edge of the screen and put Taiwan — where both arcs start — off it.
 * STACKED: under the copy, as a backdrop rather than a subject.
 */
export const GLOBE_SHOTS: Record<'split' | 'stacked', GlobeShot> = {
  split: { heightShare: 0.8, anchorX: 0.72, anchorY: 0.53 },
  stacked: { heightShare: 0.62, anchorX: 0.5, anchorY: 0.72 },
}

/**
 * CONTACT: the same globe, far larger than the frame and sunk below it, so what
 * shows is a horizon — the curve of the Earth across the lower part of the page,
 * with Riyadh lit on it, under the contact details. Not a subject; a sense of
 * place under "talk to us".
 */
export const CONTACT_SHOTS: Record<'split' | 'stacked', GlobeShot> = {
  // Low enough that the curve rises under the contact cards, not through the
  // heading above them.
  split: { heightShare: 1.75, anchorX: 0.47, anchorY: 1.42 },
  stacked: { heightShare: 1.4, anchorX: 0.5, anchorY: 1.35 },
}

/**
 * The turn that puts Riyadh on the upper edge of the visible cap: the point that
 * faces the camera is this far south of it, so Riyadh sits up toward the horizon.
 */
export const CONTACT_FOCUS = { lat: 24.7136 - 62, lon: 46.6753 } as const

/** Half the visible height per metre of distance at the site's 35° vertical fov. */
const HALF_HEIGHT_PER_METRE = Math.tan((17.5 * Math.PI) / 180)

export function globeDistanceFor(shot: GlobeShot, aspect: number, clampWidth = true): number {
  const forHeight = (GLOBE.radius * 2) / (shot.heightShare * 2 * HALF_HEIGHT_PER_METRE)
  if (!clampWidth) return forHeight
  // Portrait screens: never let the globe get wider than the frame by much.
  const forWidth = (GLOBE.radius * 2) / (1.15 * 2 * HALF_HEIGHT_PER_METRE * aspect)
  return Math.max(forHeight, forWidth)
}
