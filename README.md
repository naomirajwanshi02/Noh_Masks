# 👺 Noh and Kyogen Masks: a scan-to-wear WebAR mask room

Point your phone at the printed **Noh & Kyogen Masks card**. When the card is recognised
the mask room opens. Turn the camera round to yourself, pick one of eight traditional
Japanese masks from the bottom row, and wear it on your face, then take a photo.
Four masks come from **Noh** and four from **Kyogen**, the comic plays performed on the
same stage. Made for ages 8–14.

**Play locally:** `http://localhost:8123/`
**Without the card:** `?demo=1` · **Without any camera:** `?preview=1`
**The card to scan:** [`target.png`](target.png)

## How it works

1. **Camera permission.** A plain first screen asks for the camera (nothing about the activity yet). **Allow camera** shows the browser's prompt; it is skipped if already allowed.
2. **Scan.** The viewfinder opens. MindAR *image* tracking watches
   the back camera until it sees the card, then shuts down.
3. **Welcome.** Once the card is found, a short card explains Noh, Kyogen and the activity. Tapping **Allow camera & start**
   starts the selfie camera. This is when the browser asks for camera permission.
4. **Wear.** MindAR *face* tracking (MediaPipe Face Landmarker) follows your face. The
   mask is pinned to the whole-face pose (MindAR's faceMatrix) and then *skinned* to the live face landmarks, like a Snapchat lens: it fits your face shape, sits 2–6 mm off the skin, and its mouth and chin move with yours.
   The masks are carved in MindAR's own canonical face units (centimetres), so the eye
   holes sit over your real eyes. Pick a mask from the tray at the bottom.
5. **Tilt.** The cue under the name panel invites you to tilt your head up and down, the
   way Noh actors change a mask's mood (*terasu* / *kumorasu*).
6. **Photo.** The round button saves the mirrored selfie with the mask and a small
   caption plate. You can save it or share it.

| # | Mask | | Theatre | Who | Carved and painted with |
|---|---|---|---|---|---|
| 01 | **Kojo / Gojo** | 小尉 | Noh | old man | warm aged wood, horsehair swept up into a topknot with a pin, engraved sloping brows, wavy forehead, narrow eyes, an open red mouth, a small goatee, ears with purple cords |
| 02 | **Chujo** | 中将 | Noh | noble man | warm ivory, a dark hair band, smudged brows over a sorrowful frown, almond eyes, a thin moustache, an open mouth with blackened teeth, a chin tuft |
| 03 | **Ko-omote** | 小面 | Noh | young woman | ivory, long black hair parted in the middle and framing the face with fine light strands, soft high brows, a small red smile with black teeth, purple cords |
| 04 | **Hannya** | 般若 | Noh | female demon | bright red, black hair round a widow's peak, golden horns, ears, yellow eyes, a grinning mouth with ivory teeth and four fangs |
| 05 | **Buaku** | 武悪 | Kyogen | demon | glossy red-orange lacquer, a bald dome, heavy drooping brows, sunken eyes, a bulbous nose, puffed cheeks, a clenched toothy grin, ears with cords |
| 06 | **Uso-fuki** | 嘯吹 | Kyogen | comical pout | speckled terracotta, a bald dome, wavy brow, engraved arched brows, huge bulging eyes, a bulbous nose, a little round pursed mouth, ears with cords |
| 07 | **Saru** | 猿 | Kyogen | monkey | an olive fur cap with a widow's peak and fur down the sides, a beige face, red-rimmed round eyes, a split muzzle and a wide smile, red ears |
| 08 | **Kitsune** | 狐 | Kyogen | fox | weathered cream lacquer, a red flame on the brow, red-lined amber eyes, black whiskers, a black nose, a curling red smile, tall ears with red insides |

The look of each mask follows the reference paintings supplied for this project. Every fact in the app is sourced in [SOURCES.md](SOURCES.md).

### What makes them look real

Everything is made in code. No model files are downloaded.

- **Carving.** Each mask is a height field over an egg-shaped outline. Its features are
  Gaussian ridges, grooves and blobs: brows, sockets, nose, lips and wrinkles. Pupil
  and nostril holes are cut right through. The edge rolls over onto a lacquered back,
  so the mask has real thickness.
- **Paint (PBR).** Each mask gets a 1024 px texture set: colour, occlusion, roughness,
  metalness and a normal map. These are measured from the carving. Grime collects in
  the recesses and paint wears through on the ridges. Old lacquer gets crackle. Wood
  grain shows under the paint, and gold is truly metallic. The material uses
  `MeshPhysicalMaterial` with a lacquer clear-coat, filmic tone mapping and a studio
  environment for reflections.
- **Room light.** Twice a second the camera image is sampled. Exposure and fill light
  then ease toward the room's brightness and colour, so the mask matches your lighting.
- **Extra parts.** Horns and fangs are tapered tubes. Kojo's beard and Saru's fur are
  hundreds of tapered hair ribbons. Kitsune's ears are separate solids.

Phones use 768 px textures, so a mask takes about a second to carve. The three most
recently used masks are kept ready.

## The Anatomy look

The interface uses the [Anatomy](https://github.com/wheresryan22/anatomy) skill (MIT),
in the same sepia theme as Ramen_Builder:

- **Plates.** The name card, the welcome card, the photo caption and the card itself are
  Anatomy plates: a mono `Fig. 0n` label top-left, a title top-right, corner readouts,
  a lifted shadow and an ink hairline.
- **Theme.** [`css/anatomy-sepia.css`](css/anatomy-sepia.css) holds the warm paper and
  walnut ink token set. The kit is in [`vendor/anatomy/`](vendor/anatomy).
- **The skill itself** is installed for this workspace at `../.claude/skills/anatomy`.

## Printing the card

- Print `target.png` about **18 cm wide**. It is 3:2, so about 18 × 12 cm. Use **matte**
  paper.
- Hold the phone 20–40 cm away, in even light. The card also works on a laptop or
  tablet screen.
- The compiled target scores **3,570 detection points over 11 scales, with 48 tracking
  points**. Ramen_Builder's card scores 3,847 / 58.

## Files

| File | What it is |
|---|---|
| `index.html` | The screens: viewfinder, welcome, mask room, photo. |
| `js/app.js` | The flow: scan → welcome → camera → tray, plus hints, photo, sound and errors. |
| `js/scan.js` | Card recognition (MindAR image). |
| `js/stage.js` | Face AR (MindAR face): the mask pinned to the face pose, swapping masks, the no-camera preview, photos. |
| `js/masks.js` | The eight mask designs: carving, paint, ORM, relief and extra parts. |
| `js/sculpt.js` | Carving and painting tools: height features, outline, brushes, scrollwork. |
| `js/build.js` | Turns a design into meshes and textures. Also has tapered tubes and hair ribbons. |
| `js/look.js` | Lighting, environment, tone mapping and room-light matching. |
| `js/sound.js` | Kotsuzumi drum, hyoshigi clappers and shutter, made with WebAudio. |
| `js/data.js` | Names, kanji, roles, kid-friendly blurbs and facts. |
| `tools/mask-sheet.html` | Renders every mask. `?id=hannya&yaw=0.5` shows one up close. `?save=1` rewrites `assets/thumbs/`. |
| `tools/compare.html` | Renders each mask beside its reference painting from `tools/refs/<id>.jpg` (the references are kept out of git). |
| `tools/fit-check.html` | Shows a mask on MindAR's face model (side, front, and with the jaw dropped through the skinning) and prints how far it sits from the face. |
| `js/face-fit.js` / `js/face-model.js` | The face-fitted shell every mask is carved from, and the skinning that moves each vertex with its nearest face landmarks. |
| `tools/make-target.html` | Redraws `target.png` from the thumbnails and compiles `targets.mind` (`?build=1`). |
| `tools/serve.ps1` | A local dev server. It needs no Node or Python; localhost counts as secure for the camera. |

## Run locally

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Then open http://localhost:8123/. To try it on a phone, the page must be served over
HTTPS (for example GitHub Pages, like the other repos), because phones only allow the
camera on secure pages.

Version pins: `mind-ar@1.2.5` needs `three@0.160.0`, because three r162 removed
`sRGBEncoding`. These are the same pins as Ramen_Builder and sushi-ar.
