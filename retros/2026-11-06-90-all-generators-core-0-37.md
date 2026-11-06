# Retro: #90, every generator on core 0.37.0

## 1. Summary

#90 asked to release all 17 remaining generators on `@skmtc/core` 0.37.0, each as its next patch version, and to delete the `ownCorePin` exception. Delivered in PR #91, squash-merged as 264d740. The Publish workflow released the 15 public generators, and jsr.io shows each new version. The two Kotlin generators are private, so they do not appear there.
No golden file changed. The only source change is two gen-effect-schema test assertions, which needed core 0.37's nested `manifest.results` keys.
Run `2026-11-06-ywql1q`: 29m 52s wall clock, 26m 38s agent time. Tokens: 19,742 input, 13,979,331 cached, 117,953 output. Estimated cost about $8.94.
The most costly step was review ($4.55, 13m 18s). It found the exact-pin against range risk (deferred) and two stale comments in files outside the diff. Those cost one cheap address round ($0.41 + check $0.23). The review was worth it for the deep level this ticket asked for.

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| Open #84 already asked to rewrite the two gen-effect-schema results assertions as path lookups on this core move. Neither the ticket's Context nor the author found it, so implement changed them to another JSON substring, and the reviewer raised it again as a nit | ~2 min in implement and review; #84 is still open | ticket | orbital-ticket-prep: in Context, list the open issues that name a file the ticket will touch (`gh issue list --search <path>`) | https://github.com/skmtc/skmtc-generators/issues/84 |
| The ticket asked for exact core 0.37.0 pins. lang-typescript 0.12.40, lang-kotlin 0.11.19 and server 0.3.25 pin `^0.37.0`, and Deno does not merge an exact pin into a range it resolved first. So the #48 two-core failure returns once core 0.37.1 ships | none yet; a future empty-output incident | ticket | Owner decides one pin policy, caret or a lock-step release; then ticket-prep checks the generator pins against the companion packages' ranges | triage |
| Review flagged two stale comments outside the diff: `test-support/mod.ts` (results-key shape `/error-logs:get`) and `tests-coverage.yml` (`lang-kotlin@0.11.3`). The author's grep searched only for the versions it was replacing | 1 address round, ~3 min, ~$0.64 | review-rule | skmtc-generator skill release notes: on a core or companion pin move, grep the repository for the old key formats and for every `@<pkg>@<x.y.z>` in prose, not only for the old pins | triage |
| The root `check` task leaves out md-docs, kotlin-jackson, kotlin-spring and fetch-example, so the author ran `deno check` on those four by hand. The root `publish` task is out of order and leaves out fetch-example | ~1 min | check | Generate or test the root task lists from `workspace` (#59) | https://github.com/skmtc/skmtc-generators/issues/59 |
| The first scratch project for the one-core done-when failed: workspace members resolve `ts-pattern` and other packages from the root import map, not their own `deno.json` | ~1 min, one command | navigation | CLAUDE.md "Development Workflow": say that members rely on root imports, so a scratch workspace must copy the root `imports` | triage |
| A mutation run with `deno test --frozen` against a stale lock printed nothing that the grep kept, so the guard check had to run a second time without `--frozen` | ~1 min | tool-cost | Prompt mutation steps to re-resolve with `deno install` and restore with `git checkout`, as the second run did | none, minor one-off |

## 3. Keep

- Reproduce a dependency done-when in a scratch workspace both ways: the published versions gave two cores, the new ones one. Write it into the skmtc-generator skill's release notes.
- Commit before mutation checks, so `git checkout` restores pins and `deno.lock` exactly. Already done in practice, not yet written down; add it to the implement prompt.
- Check `jsr.io/@skmtc/<name>/meta.json` before choosing patch versions, so no version is already taken.

## 4. Deferred

- Every `gen-*/deno.json` (for example `gen-typescript/deno.json:14`): the core pin is exact, while lang-typescript, lang-kotlin and server use `^0.37.0`. Anyone who installs a stack after core 0.37.1 ships could get two cores and empty files. https://github.com/skmtc/skmtc-generators/pull/91#issuecomment-6693052527
- `deno.json` `publish` task and `CLAUDE.md:33-37`: describe a manual publish in the wrong order (shadcn-form before shadcn-select) and leave out gen-fetch-example. An agent that follows CLAUDE.md would publish by hand. Same source.
- `gen-effect-schema/src/EffectProjection.test.ts:512,537`: still JSON-substring assertions that depend on key order. Whoever moves core next meets them. #84 and the PR #91 nits.
- `deno.json` `check` task: leaves out four members (see #59). A core API break in those mod.ts files would pass `deno task check`.
- `test-support/test/workspace.test.ts` lockfile test: a stale lock fails with a message that does not say to run `deno install` (reviewer summary). Anyone who bumps a pin without updating the lock meets it.
- A breaking core move ships under patch bumps for every generator (reviewer summary). Consumers on `^0.2.x` ranges get the core 0.37 manifest shape without a minor bump.
