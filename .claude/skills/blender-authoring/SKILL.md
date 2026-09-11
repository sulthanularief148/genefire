---
name: blender-authoring
description: Authoring GENEFIRE product models in Blender for web export, including the Blender MCP server so Claude can drive Blender directly. Use when modelling, retopologising, baking, or exporting any product asset from Blender.
---

# Blender authoring for web export

## Connecting Blender to Claude (Blender MCP)

`blender-mcp` lets Claude inspect and drive a running Blender session — create objects,
apply materials, set up cameras and lighting, and run Python inside Blender.

**Install:**

```bash
# 1. Install uv (the official installer, not pip)
#    Windows PowerShell:
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# 2. Register the server with Claude Code
claude mcp add blender uvx blender-mcp

# 3. In Blender: Edit → Preferences → Add-ons → Install…
#    Pick addon.py from the blender-mcp repo, enable it.
# 4. In the 3D viewport sidebar (N key) → BlenderMCP tab → Connect.
```

Claude Desktop equivalent, in `claude_desktop_config.json`:

```json
{ "mcpServers": { "blender": { "command": "uvx", "args": ["blender-mcp"] } } }
```

**Tools it exposes:** scene inspection, create/modify/delete objects, material assignment,
camera and light control, asset pulls from Poly Haven / Sketchfab / Poly Pizza / Hyper3D,
and `execute_blender_code` for arbitrary Python.

**Working rules — these come from the tool's own documentation and from how it actually behaves:**

1. `execute_blender_code` runs arbitrary Python in your Blender process. **Save before every
   call.** Treat it the way you would treat `rm -rf` with a variable in it.
2. Break complex work into small sequential steps. "Model the SX300 canister" fails.
   "Add a cylinder radius 0.047 height 0.135 at origin, 64 sides" succeeds.
3. Run **one** MCP client against Blender at a time. Two clients fight over the socket.
4. The first command after connecting often fails. Retry once before debugging anything.
5. Poly Haven needs internet; Poly Pizza fails behind VPNs and datacenter IPs.

For this project Blender MCP is most useful for the **staging** work — HDR environment setup,
camera framing that matches the site's 35 mm FOV, turntable renders for fallback stills — and
least useful for precision hard-surface modelling, where typing exact dimensions into
Blender's N-panel is faster than describing them.

## Modelling rules for these products

Every GENEFIRE unit is a body of revolution plus brackets. Model them as such.

| Product | Approach |
|---|---|
| PX1M, PX1E, SX 25/50/100 | Spin/screw a profile curve. 48–64 radial segments is plenty; a 32 mm cylinder at 64 segments is already sub-pixel smooth at any realistic screen size. |
| SX 5/10 | Box with bevelled edges, 0.5 mm bevel. |
| PX 5 | Cylinder body + swept handle. The handle is the only organic form in the range — give it the poly budget. |
| SX 300/500/750/1500 | Cylinder + rolled top dome + separate bracket object. Keep bracket as its own mesh so it can be hidden in the exploded view. |

- **Model to real dimensions in metres.** Blender scene units → Metric, Unit Scale 0.001,
  Length = Millimeters. Type `183mm` and Blender stores 0.183. Then no export scaling.
- **Bevel every hard edge** at 0.3–0.8 mm. Perfectly sharp edges catch no highlight and make
  a metal read as plastic. This is the single biggest quality difference between an amateur
  and a professional product render.
- **Apply all modifiers before export.** Subdivision, mirror, array — glTF bakes what it
  sees, and an unapplied mirror is the classic cause of flipped normals in the browser.
- **Recalculate normals outside** (Shift+N) on every object, every time, before export.
- **No n-gons on curved surfaces.** They triangulate unpredictably and produce shading
  artefacts that only appear in three.js.
- Target ≤ 12 k triangles per product. A cylinder at 64 segments with capped ends and a
  bevelled lip lands around 2–4 k. If you are at 40 k you have subdivided something you
  should have baked to a normal map.

## Materials

Principled BSDF only. glTF exports Base Color, Metallic, Roughness, Normal, Emission,
Occlusion and nothing else — Mix Shaders, procedural noise, Musgrave and geometry nodes all
export as flat grey.

Name materials exactly as in the glb-gltf-pipeline skill: `GF_RedAnodized`,
`GF_Stainless`, `GF_BlackPolymer`, `GF_RedPolymer`, `GF_Bracket`.

If you need procedural detail (brushed steel anisotropy, the fine grain on anodized
aluminium), **bake it to an image texture** before export.

Anodized aluminium: Base Color `#E1251B`, Metallic 0.75, Roughness 0.32. Real anodizing is a
translucent dye over metal, so it stays metallic — dropping metallic to 0 gives you red
plastic.

## Baking

Bake when the geometry cost exceeds the texture cost:

- **Normal map** — from a high-poly with the raised GENEFIRE logo, warning text and knurling,
  onto a smooth low-poly. This is how you get crisp branding at 2 k triangles.
- **AO** — bake to a 1024 map and multiply into Base Color for the industrial canisters,
  where the bracket shadow does a lot of the grounding work.
- Do **not** bake full lighting into Base Color. The site relights everything with its own
  HDR; baked lighting will fight it and look wrong from every other angle.

UV rule: one UV set, no overlapping islands if you are baking, 4 px padding at 1024.

## Export settings

`File → Export → glTF 2.0 (.glb)`

```
Format                 glTF Binary (.glb)
Include                Selected Objects  ✓
Transform → +Y Up      ✓                    ← Blender is Z-up, three.js is Y-up
Data → Mesh            Apply Modifiers ✓  UVs ✓  Normals ✓
                       Tangents ✓ (only if shipping a normal map)
                       Vertex Colors ✗ (unless actually used — silent size cost)
Data → Material        Export: Placed  |  Images: WebP or Auto
Compression (Draco)    OFF                  ← compress with gltf-transform instead, see below
Animation              OFF (unless the model is animated)
```

Turn Blender's Draco off. Compress in the pipeline with `gltf-transform`, where you can pick
meshopt vs draco per asset and re-run it without reopening Blender.

Before export: origin at base centre (`Object → Set Origin → Origin to 3D Cursor` with the
cursor snapped to the bottom face), rotation and scale applied (`Ctrl+A → All Transforms`),
object named `genefire_<id>_<part>`.

Then hand off to the glb-gltf-pipeline skill for optimization and validation.

## Fallback renders

While you have the model in Blender, render the four fallback stills the site needs:
`front`, `side`, `top`, `hero` at 900 px on transparent film, Cycles, 128 samples with
denoising. They serve no-WebGL visitors and `prefers-reduced-motion` users. The parametric
placeholders in `assets/products/<id>_views/` already fill these slots — match their framing
so nothing shifts when you swap them.
