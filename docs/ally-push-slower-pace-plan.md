# Ally Push and Slower Pace Plan

## Current and requested behavior

- Allies currently pass through one another because only ally/enemy contacts are resolved. Allies should instead push one another apart while both remain alive.
- Ally bullets currently travel at `1.35` world units per second. They should travel at roughly half that speed without unintentionally halving their effective range.
- Course progress currently advances at `24` distance units per second. Gates and road bands share that progress value, but the overall gate/number flow and walking impression are still too fast. Course progress, gate cadence, and walking animation should be slowed together.

## Scope

### In scope

- Deterministic pairwise separation for overlapping allies, with equal displacement applied to both allies where track boundaries allow it.
- Persistence of collision displacement through normal formation reflow and random wandering.
- Existing edge-fall behavior applied after collision pushes, including cleanup of projectiles targeting fallen allies.
- Ally bullet speed reduced by half, with lifetime increased proportionally to preserve approximate travel range.
- Course progress reduced from `24` to `16` distance units per second.
- Gate spawn cadence and ally/enemy gait animation reduced by the same `2/3` factor so numeric flow, road scrolling, and walking poses remain visually consistent.
- README and deterministic tests updated for the new rules.

### Out of scope

- Changes to ally fire cooldown, damage, targeting, or hit radius.
- Changes to enemy projectile speed or enemy pursuit speed.
- Changes to ally/enemy contact elimination, boss contact behavior, gate arithmetic, or player steering speed.
- A general-purpose rigid-body physics engine, momentum, mass, bounce, or rotational physics.

## State-model changes

- Add a named course-speed constant and use it as the single source of truth for distance progress.
- Add an ally collision-radius constant.
- Store collision displacement on each ally separately from formation position and random-wander displacement.
- Add a deterministic ally-contact resolver that processes stable ID-ordered pairs and performs a small fixed number of separation passes.
- When exact coordinate overlap has no geometric normal, derive a stable fallback direction from the pair IDs.
- Remove allies pushed beyond the horizontal track boundary and clean projectiles that target them.
- Halve the ally bullet speed constant and double bullet lifetime.

## Rendering changes

- Reduce ally gait phase rate from `9` to `6` and enemy gait phase rate from `7.5` to `5`, matching the `24` to `16` course-speed ratio.
- Keep road bands and gate labels on the existing shared `projectCourseY` projection; slowing the course-speed source automatically slows both identically.
- Increase the gate spawn interval from `3.25` to approximately `4.875` seconds to retain the existing course spacing at the slower progress rate.

## Deterministic tests and browser validation

- Verify two overlapping allies are separated to at least the collision diameter, remain alive, and receive equal/opposite displacement.
- Verify exact-overlap resolution produces identical results across repeated runs and stable ID ordering.
- Verify a collision push can send an ally across a track edge, removing it and any enemy projectile targeting it.
- Verify one second advances the course by `16`, and gates and road markers still share the same projection.
- Verify a newly fired ally bullet has half the previous speed and proportionally extended lifetime/range.
- Run `npm test` and `git diff --check`.
- In the browser, run the test page and verify all tests pass without console errors.
- Check the game at desktop and mobile widths for visible slower synchronized road/gate flow, walking animation, ally separation, layout overflow, and restart behavior.

## Ordered implementation steps and commit boundaries

1. Add this implementation plan and open the draft pull request.
   - Intended commit: `Plan ally push and slower pace`
2. Add persistent ally collision displacement, deterministic contact resolution, edge cleanup, half-speed bullets, slower course progress, and state tests.
   - Intended commit: `Add ally push physics and slower projectiles`
3. Synchronize gait and gate cadence with the slower course, update documentation, and complete rendering/browser validation.
   - Intended commit: `Synchronize slower course visuals`
4. If review or validation finds defects, address each coherent finding in a separate follow-up commit.

## Acceptance criteria

- Allies visibly push apart on contact rather than overlapping, and neither is removed solely because of ally/ally contact.
- Collision resolution is deterministic and does not produce `NaN` or unstable exact-overlap behavior.
- Allies pushed beyond a track edge follow the existing fall/removal rule.
- Ally bullets move at half their previous speed while retaining approximately the previous maximum travel distance.
- Gate labels and road bands move together at the slower course rate, and stick-figure gait is correspondingly slower.
- Existing ally/enemy combat behavior and controls continue to pass automated and browser checks.

## Risks and assumptions

- “Allies push each other” is interpreted as positional separation, not momentum-based simulation.
- “Bullet speed” is interpreted as blue ally bullets; orange enemy projectiles are intentionally unchanged.
- “A little slower” is implemented as a one-third reduction in course and gait speed (`24 → 16`), while bullet speed is the explicitly requested one-half reduction.
- Dense squads may require several fixed collision passes. A bounded pass count keeps frame cost predictable and deterministic, but very large crowds may retain small residual overlaps.
- Collision pushes can cause an edge fall, consistent with the existing screen-edge rule.
