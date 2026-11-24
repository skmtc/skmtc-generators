# Retro: #113, every generator on core 0.45.0

## 1. Summary

#113 asked for every generator on `@skmtc/core` 0.45.0, lang-typescript 0.14.7 and lang-kotlin 0.11.29, one patch up, in the same shape as #110.
It was delivered in PR #114 (squash `1210194`). Publish succeeded, and jsr.io shows all 16 public generators at the predicted versions, including gen-effect-http 0.1.15.
The run took 16m 00s (12m 45s agent time): 25,335 input, 6,973,031 cached and 45,208 output tokens, about $4.49.
`implement` cost the most: $2.34, 6m 50s. Most of that went on about 30 hand edits to 19 `deno.json` files, plus checking a lint failure that came from the worktree's location.
That was worth it for a release, but the edits are mechanical (see #67).
There was one review round. The reviewer found that the lockfile tested only one of the three packages the done-when item named.

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| In `implement`, the lockfile was checked only with an ad hoc `grep` of `deno.lock`. `test-support/test/workspace.test.ts` already tested the core part, but the author did not know the file existed. The reviewer found that two copies of lang-typescript or lang-kotlin in the lock passed CI. | 1 review round: address $0.55 + check $0.54, ~3 min | navigation | In release tickets' Context (orbital-ticket-prep), name `test-support/test/workspace.test.ts` as the guard for pin and lock items | triage |
| In `implement`, `cd gen-md-docs && deno lint` reported 4 `ban-unused-ignore` errors. The cause: the skmtc lint plugin goes silent under `~/.orbital/worktrees/...` (a dot-directory). Ruling the change out took two scratch worktrees in `/tmp`. | ~2 min, ~4 tool calls | check | skmtc lint-plugin: run its rules under dot-directories, or have the workflow create worktrees outside a dot-path | triage |
| In `implement`, the version bump took about 30 `Edit` calls across 19 `deno.json` files: each member one patch up, plus the pins between members. The step prompt bans scripted edits. | ~3 min, a large share of implement's 2.7M cached tokens | tool-cost | `.scripts/release.ts` gets a `bump` mode that writes the patch cascade and the pins (#67) | [#67](https://github.com/skmtc/skmtc-generators/issues/67) |
| In `address`, `deno fmt --check test-support/test/workspace.test.ts` fails on main as well: the root fmt defaults (double quotes, semicolons) disagree with the file's style. | <1 min | check | Add `"fmt": { "singleQuote": true, "semiColons": false }` to `test-support/deno.json`, as gen-effect-* have | triage |
| The `self-review` step's `/review high` raised two older problems and nothing in the diff. The pin-diff ticket had `review_depth = light`, but the step still ran a high-effort review. | forked review, tokens not recorded | workflow | In `implement-ticket-dg`, scale the self-review level with `review_depth` (light → `/review low`) | triage |

## 3. Keep

- Checking that a guard fails (revert one pin, re-resolve, see two cores in the lock) is cheap evidence for pin tickets. It is already in the implement prompt.
- Reading the live jsr.io `meta.json` for every published generator in `follow_on` closes the post-merge done-when item for sure. Keep that in follow_on for release tickets.

## 4. Deferred

- Root `deno.json` task `publish`: it publishes gen-shadcn-form before gen-shadcn-select, and it leaves out the kotlin generators and gen-fetch-example. A maintainer who runs it by hand, as CLAUDE.md says, gets a failed or partial release. CI uses `deno task release` and does not hit this. Raised by self-review on PR #114. Covered by #59.
- `gen-kotlin-spring/deno.json:16` imports `../gen-kotlin-jackson/mod.ts` by relative path instead of a `jsr:` pin, so `.scripts/release.ts` does not order or cascade it. This matters only once the kotlin packages stop being private. Raised by self-review on PR #114.
