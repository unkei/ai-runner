# Fix Architecture draw.io Overlap Plan

## Current Behavior

- `docs/architecture.drawio` contains an architecture diagram with a "State Data Model (Immutable Objects)" section.
- The State Data Model boxes are laid out in a single horizontal row.
- Some composition connectors run directly between or across model boxes, making the section visually dense and harder to read.

## Requested Behavior

- Improve the draw.io layout so boxes and connector lines do not visually overlap.
- Prioritize readability of the State Data Model section.
- Preserve the existing architecture content and object relationships.

## In Scope

- Adjust positions and dimensions of State Data Model boxes.
- Adjust connector styles, endpoints, and waypoints so relationship lines route through clear whitespace.
- Expand the State Data Model container if needed to make the routing legible.
- Keep changes limited to `docs/architecture.drawio` unless validation exposes a documentation consistency issue.

## Out of Scope

- Changing application source code or runtime behavior.
- Redesigning unrelated diagram sections.
- Changing the semantic relationships documented by the diagram.
- Rewriting the Markdown architecture documentation.

## State-Model and Rendering Changes

- State model semantics remain unchanged.
- Diagram rendering changes:
  - Split the State Data Model into clearer lanes.
  - Route GameState composition connectors through whitespace instead of across boxes.
  - Place connector labels near their routed segments with label backgrounds enabled for readability.

## Deterministic Test Cases and Browser Validation

- Verify the draw.io XML remains well-formed using an XML parser.
- Inspect the State Data Model XML to confirm box geometries and connector waypoints are deterministic and intentional.
- If a browser or draw.io renderer is available, open the diagram and visually confirm that the State Data Model connectors no longer overlap boxes.

## Implementation Steps and Commit Boundaries

1. Plan commit: add this implementation plan only.
2. Diagram layout commit: update `docs/architecture.drawio` State Data Model geometry and connector routing.
3. Validation commit if needed: apply any follow-up documentation-only correction found during review or validation.

## Acceptance Criteria

- State Data Model boxes are readable and not crossed by relationship lines.
- Relationship lines have clear paths and visible labels.
- The draw.io file is valid XML.
- No product code changes are included.

## Risks and Assumptions

- Assumption: preserving diagram semantics is more important than preserving exact original box positions.
- Risk: XML-level editing cannot fully replace visual verification in draw.io, so final review should include opening the diagram when possible.
