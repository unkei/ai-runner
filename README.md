# ai-runner

A lightweight browser game prototype for a crowd-clash runner.

## Gameplay

- Move freely left and right with `ArrowLeft`/`ArrowRight`, `A`/`D`, drag/touch, or the on-screen buttons.
- Every blue stickman independently finds a nearby enemy and automatically fires a reusable gun with a one-second cooldown; each bullet locks its direction when fired and continues straight instead of homing toward a moving target.
- Blue stickmen wander independently with animated walking poses while strongly returning toward a compact formation centered around the squad anchor. Front-to-back collision displacement recovers faster so the squad does not stretch into a long column. A stickman that wanders beyond a track edge falls from the squad.
- Blue stickmen physically push one another apart when their paths overlap; a collision push can also send a stickman over a track edge.
- Every enemy stickman independently chooses an ally, moves, and attacks. Enemy projectiles damage only the ally they hit.
- Large waves of 12–30 enemies form compact rows of up to eight columns across the front and advance from the far end of the track.
- Every fourth enemy wave adds a purple midboss that takes multiple shots to defeat and displays its remaining HP.
- When an enemy and ally stickman collide directly, that matched pair disappears.
- Gates are fixed to positions on the course and approach only through forward player progress; every pair randomizes one positive and one negative `+`, `-`, `x`, `*`, or `/` squad operation across the left and right sides. Positive results queue reinforcements that appear one at a time at the squad center, pushing earlier allies outward.
- Road bands and gate labels share one world-distance projection, so their forward scrolling stays synchronized.
- Course progress, gate cadence, and walking animation run at the same slower pace, while blue bullets travel at half their previous speed without losing their approximate range.
- Later stages introduce archers that independently aim and fire at allies.
- The final stretch introduces a large multi-hit boss, but direct contact still removes the boss and the single ally it touches.
- The run ends when squad size reaches `0`; Restart starts a fresh run.

## Run

```sh
npm run dev
```

Then open http://127.0.0.1:4173/.

The app uses browser ES modules, so serving the directory over local HTTP is the supported no-install launch path.

If port `4173` is already in use, run an alternate local server:

```sh
python3 -m http.server 4174
```

Then open http://127.0.0.1:4174/.

## Test

```sh
npm test
```

Browser test harness: http://127.0.0.1:4173/tests.html

If you used the fallback port, open http://127.0.0.1:4174/tests.html instead.

## Final Validation Checklist

- `npm test` passes.
- Browser test harness reports all tests passing.
- Desktop smoke at 1280x720 has no console errors.
- Mobile smoke at 390x844 has no horizontal overflow.
- Restart returns squad size to the initial value.
