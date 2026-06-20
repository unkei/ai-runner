# Repository Work Rules

## Required Delivery Workflow

Unless the user explicitly overrides it, every repository change must follow this workflow:

1. Inspect the repository and write an implementation plan under `docs/` before changing product code.
2. Create one `codex/...` feature branch from the latest `origin/main`. Do not work directly on `main`.
3. Commit the plan and push the branch, then open a draft pull request targeting `main`.
4. Implement the plan one step at a time. Each step must be a coherent, reviewable commit.
5. Push every completed step and add a pull-request comment describing what changed and any relevant design decisions.
6. Review the complete diff and add a separate pull-request comment with the findings. Resolve all blocking findings before continuing.
7. Run the relevant automated tests and browser checks. Add a separate pull-request comment containing the commands, results, and any checks that could not be run.
8. After all planned steps, review findings, and test results are complete, mark the pull request ready for review.
9. Review the ready pull request as a whole, including its mergeability and checks. Merge it into `main` only when no blocking issue remains.
10. Switch the working directory back to `main`, fast-forward it to `origin/main`, and confirm that the worktree is clean.

## Pull Request Requirements

- Open the pull request as draft immediately after the plan commit is available remotely.
- Keep the pull-request description current with scope, rationale, implementation steps, and validation.
- Use distinct comments for implementation progress, review results, and test results so each record is independently auditable.
- Do not mark a pull request ready or merge it while planned work, blocking review findings, or required checks remain incomplete.
- Do not include unrelated local commits or user changes in the branch.

## Planning Requirements

Every implementation plan must define:

- current behavior and the requested behavior;
- explicit in-scope and out-of-scope items;
- state-model and rendering changes;
- deterministic test cases and browser validation;
- ordered implementation steps with intended commit boundaries;
- acceptance criteria and notable risks or assumptions.

Planning-only requests stop after delivering and merging the planning/documentation change. Product-code implementation requires a separate explicitly requested execution task and must follow the approved plan.
