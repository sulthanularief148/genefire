---
name: ai-video-assets
description: Generating and encoding AI video and motion assets for the Almaghrabi site — hero loops, application-scene b-roll, texture sequences — and the rules for what should be video versus real-time 3D. Use when adding any video, looping background, or generated motion asset.
---

# AI video assets

## First: decide whether it should be video at all

This site already spends its budget on a WebGL scene. Video and real-time 3D compete for the
same bandwidth and the same decode time, so each asset needs a reason.

| Use real-time 3D | Use video |
|---|---|
| Anything the user controls (rotate, explode, scrub) | Anything with real fire, smoke, or a real facility |
| Anything scroll-linked | Establishing shots and b-roll behind text |
| The products themselves | Human presence — a technician, an inspection walkthrough |
| Anything that must stay sharp at any zoom | Diffuse, out-of-focus, atmospheric backdrops |
| Anything that must be recoloured or relit | One-off cinematic moments too costly to simulate |

Rule of thumb for this build: **the products are always real-time; the world around them may
be video.**

## What to generate

1. **Hero ambient loop (6–8 s, seamless)** — slow drifting particulate in a dark volume, red
   rim light. Sits *behind* the canvas at very low opacity as an atmospheric bed. Never
   contains a product.
2. **Application b-roll (4–6 s each, ×6)** — data centre aisle, switchgear room, rail
   interior, plant floor, laboratory, vehicle bay. Slow push-in, shallow depth of field,
   no people close enough to identify, no legible signage.
3. **Fire/heat texture plates** — ember drift, heat shimmer, smoke wisps. Generated as video,
   then extracted as frame sequences and used as **shader textures** in the R3F scene rather
   than as `<video>` elements. This is usually the highest-value output: it gives you
   film-grade smoke at almost no runtime cost.
4. **Discharge reference** — an aerosol plume expanding into an enclosure. Use it as *visual
   reference* for tuning the particle shader, not as final footage. The real discharge moment
   must be real-time so it can be scroll-scrubbed.

## Prompting for these

Style spine, applied to every prompt so the set feels like one shoot:

> anamorphic cinematic, 35 mm, shallow depth of field, low-key industrial lighting,
> desaturated cool greys with a single warm red accent, slow deliberate camera push,
> volumetric haze, no text, no logos, no identifiable people, seamless loop

Per-shot example:

> Slow dolly push down a dark data centre cold aisle. Server rack LEDs as small cyan points.
> Volumetric haze catches a low red emergency wash from the left. Camera moves 40 cm over 6
> seconds. Static framing at start and end for seamless loop. Anamorphic cinematic, 35 mm,
> shallow depth of field, no text, no people.

Practical notes:

- **Ask for a static first and last frame** if you need a loop; most models will not loop on
  their own and you will fix it in the crossfade below.
- **Generate at the highest resolution the tool offers, then downscale.** Downscaling hides
  generation artefacts; upscaling reveals them.
- **Never generate the products.** An AI-generated fire extinguisher will have the wrong
  number of bands, invented text and a hallucinated logo, and it will be shown to a client
  who knows exactly what their product looks like. Products come from the .glb models.
- **Never generate certification marks, standards logos, or anything that looks like
  evidence.** ISO/CE/SGS marks come from the client's own approved artwork.
- Keep a `assets/video/PROMPTS.md` recording the exact prompt, tool, model version, seed and
  date for every clip. Reshoots six months later depend on it.

## Making a clip loop

```bash
# 12-frame crossfade between tail and head
ffmpeg -i in.mp4 -filter_complex \
 "[0]split[a][b];[a]trim=0:5.5,setpts=PTS-STARTPTS[main];\
  [b]trim=5.5:6,setpts=PTS-STARTPTS[tail];\
  [main][tail]xfade=transition=fade:duration=0.5:offset=5[out]" \
 -map "[out]" -an loop.mp4
```

## Encoding — ship two formats

```bash
# AV1 — best compression, modern browsers
ffmpeg -i loop.mp4 -c:v libsvtav1 -crf 34 -preset 6 -g 48 \
       -pix_fmt yuv420p -an -movflags +faststart out.av1.mp4

# H.264 High — universal fallback, Safari-safe
ffmpeg -i loop.mp4 -c:v libx264 -crf 24 -preset slow -profile:v high -level 4.1 \
       -g 48 -pix_fmt yuv420p -an -movflags +faststart out.h264.mp4

# Poster frame — shown before the video decodes
ffmpeg -i loop.mp4 -vf "select=eq(n\,0)" -q:v 2 poster.jpg
```

```html
<video autoplay muted loop playsinline preload="none" poster="/video/poster.jpg">
  <source src="/video/hero.av1.mp4" type="video/mp4; codecs=av01.0.05M.08" />
  <source src="/video/hero.h264.mp4" type="video/mp4" />
</video>
```

`muted` and `playsinline` are both required or iOS refuses to autoplay. `-an` strips audio —
a muted autoplay loop shipping an audio track is pure waste. `+faststart` moves the index to
the front so playback starts before the file finishes downloading.

## Budgets

| Asset | Resolution | Target size |
|---|---|---|
| Hero ambient loop | 1920×1080 | ≤ 1.5 MB |
| Application b-roll (each) | 1280×720 | ≤ 800 KB |
| Texture plate (frame sequence) | 512×512 ×48 frames | ≤ 600 KB as KTX2 array |
| Total video on first load | — | **0 bytes** |

That last row is the important one. Nothing below the fold loads until it is near the
viewport:

```jsx
const ref = useRef()
useEffect(() => {
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { ref.current.preload = 'auto'; ref.current.load() }
  }, { rootMargin: '300px' })
  io.observe(ref.current); return () => io.disconnect()
}, [])
```

## Reduced motion

`prefers-reduced-motion: reduce` must pause every loop and show the poster frame. A looping
background video is one of the most common triggers for vestibular discomfort.

```css
@media (prefers-reduced-motion: reduce) { video { display: none; } .video-poster { display: block; } }
```

## Disclosure

Any AI-generated footage that could read as documentary — a real facility, a real incident —
gets labelled or is not used. Almaghrabi sells life-safety equipment; a generated image
presented as a real installation is a liability, not a design choice. Atmospheric and
abstract plates need no label.
