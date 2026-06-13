# ai-runner

A lightweight browser game prototype for a crowd-clash runner.

## Gameplay

- Move freely left and right with `ArrowLeft`/`ArrowRight`, `A`/`D`, drag/touch, or the on-screen buttons.
- The squad does not shoot. Crowd groups collide one-for-one, and both sides lose the same number of characters.
- Gates appear as two side-by-side choices and apply `+`, `-`, `x`, `*`, and `/` squad operations.
- Later stages introduce archers that fire arrows.
- The final stretch introduces a large boss that requires dozens of squad members to cancel out.
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
