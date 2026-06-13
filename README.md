# ai-runner

A lightweight browser game prototype for a 3-lane auto-shooter runner.

## Gameplay

- Move between three lanes with `ArrowLeft`/`ArrowRight`, `A`/`D`, swipe, or the on-screen buttons.
- The squad fires automatically in the current lane.
- Enemies approach from the front, take bullet damage, and reduce squad size on contact.
- Gates apply `+`, `-`, `x`, `*`, and `/` squad operations when collected in the current lane.
- Pickups add squad members.
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
- Restart returns squad size to `5`.
