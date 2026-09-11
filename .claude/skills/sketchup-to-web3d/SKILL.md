---
name: sketchup-to-web3d
description: Getting SketchUp geometry (installation scenes, server rooms, switchgear rooms, plant layouts) out of SketchUp and into a web-ready .glb. Use when a .skp file is the source of any asset on the Almaghrabi site.
---

# SketchUp → web 3D

SketchUp is the right tool for the **environments** on this site — the data centre aisle, the
switchgear room, the rail car interior, the workshop — because those are architectural
volumes and SketchUp draws them fast. It is the wrong tool for the products themselves; those
belong in Blender (see the blender-authoring skill).

## Getting a .glb out of SketchUp

There is no reliable built-in glTF export in the desktop app. Three routes, best first:

**1. SketchUp glTF Exporter extension (Extension Warehouse)** — direct `.gltf` / `.glb`.
Fastest path when it works. Check it preserved materials before trusting it.

**2. SimLab glTF Exporter for SketchUp** — commercial, more robust on large scenes and better
material handling. Worth it if environments are a recurring deliverable.

**3. Via Blender (the reliable fallback):**
```
SketchUp → File → Export → 3D Model → Collada (.dae)
Blender  → File → Import → Collada
           clean up (below) → export .glb per the blender-authoring skill
```
This route is slower but it never surprises you, and you need Blender in the loop for
cleanup anyway.

SketchUp for Web / for Schools cannot export glTF at all — export `.dae` and go through
Blender.

## SketchUp geometry is hostile to the web — clean it before export

SketchUp models are built for drawings, not for GPUs. Assume every imported scene needs all
of this:

| Problem | Why it matters | Fix |
|---|---|---|
| **Two-sided faces with no consistent normals** | Random black faces in three.js | In SketchUp: View → Face Style → Monochrome, then `Reverse Faces` on every blue face. In Blender: Shift+N recalculate outside. |
| **No UVs on untextured faces** | Cannot bake, cannot texture later | Smart UV Project in Blender at 0.02 island margin |
| **Hundreds of tiny materials** | One draw call each | Merge to ≤ 8 materials before export. This is usually the single biggest win. |
| **Every edge is a hard edge** | Faceted, ugly shading | Set Auto Smooth to 30° in Blender |
| **Coplanar and hidden interior faces** | Z-fighting and wasted triangles | Delete interiors; nobody sees the inside of a wall |
| **Components exploded into loose triangles** | No instancing possible | Re-group repeated objects and use `<Instances>` in R3F |
| **Metres vs inches vs millimetres** | Model imports 1000× or 39× wrong | Set SketchUp units to Metric/Millimetres *before* modelling; verify a known dimension after import |
| **Y-up vs Z-up** | Scene lies on its side | Export with +Y up from Blender |

Rough triangle counts: a SketchUp room that "feels light" in SketchUp routinely lands at
300 k–2 M triangles after import. The budget for a background environment on this site is
**≤ 60 k triangles**. Expect to decimate hard:

```bash
npx gltf-transform optimize room_raw.glb room.glb \
  --compress draco --simplify true --simplify-error 0.002 \
  --texture-compress ktx2 --texture-size 2048 --weld
```

Background environments are the one place draco is right: they load lazily and are never in
the first viewport.

## What to model in SketchUp for this site

Only what supports the product story. The environments exist to show **where a GENEFIRE unit
goes**, so model the mounting context and let everything else fall away into fog:

- **Data centre**: two rack rows, hot aisle, cable tray. SX 100 mounted inside a rack.
- **Switchgear / power**: one MV cabinet, door open, SX 25 on the inner roof panel.
- **Rail**: a section of under-seat / traction-converter housing with an SX 50.
- **Industry**: a CNC enclosure or paint booth with an SX 300 on its bracket.
- **Military**: a vehicle engine bay volume — geometry only, no identifiable platform.
- **Laboratory**: a fume hood and a solvent cabinet with an SX 5/10 bar.

Model to real dimensions. The whole point of the coverage section is that a 15 m³ cabinet
takes an SX 300, and that only lands if the cabinet is actually 15 m³.

Keep environments **low-contrast and desaturated**. They are the stage; the red product is
the actor. If the room competes, dial its albedo down rather than making the product
brighter.

## Handoff

A SketchUp-sourced asset is done when it passes the same gate as everything else in
glb-gltf-pipeline: `gltf-transform inspect`, `gltf-validator` clean, correct in the online
viewer, sensible node names in the console. Additionally:

- [ ] ≤ 60 k triangles
- [ ] ≤ 8 materials
- [ ] Real-world scale verified against one known dimension
- [ ] Interior/hidden faces deleted
- [ ] No SketchUp default `material0`/`Color_A03` names left in the file
