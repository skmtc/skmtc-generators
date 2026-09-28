# Retro: #64, bases call `<Base>.toIdentifierName`, not `this.toIdentifierName`

Orbital run `2026-09-28-rrdy2p` (`implement-ticket-dg`). It started 2026-09-28 20:17 and had run for 47m 51s when this retro was written. The retro turn itself is not counted in these figures.

## 1. Objective and summary

**What #64 asked for:**
- In every stock base's `toExportPath`, call the base by name (`ZodBase.toIdentifierName(...)`) instead of `this.toIdentifierName(...)`. The `to*ProjectionBase` factories bind these functions to the config object, so `this` never reaches a projection's override. The `this.` form made readers expect that it does.
- 11 bases: 10 TypeScript generators plus gen-kotlin-jackson.
- Patch-bump the changed TypeScript generators and move the exact pins between stock generators to the new versions. Let CI publish.
- gen-kotlin-jackson: change the code, with no bump and no publish.
- Behavior must not change: existing tests pass without new expectations.

The workflow goal added a constraint the ticket didn't state: "bump and republish **only** the 10 TypeScript generators".

**What was delivered:**
- **PR #66**, squash-merged as `17afb3d`. It closed #64. It contains:
  - The 11 one-line base changes (3d88123).
  - The 10 TypeScript version bumps, with pins between them moved (3d88123).
  - Review fix (26c3276): gen-express, gen-msw and gen-supabase-hono bumped to 0.2.8, with their five pins on gen-typescript, gen-zod and gen-valibot moved to 0.2.8.
  - Review fix (b76d60a): a two-line comment above each `toExportPath`. It says why the base calls itself by name, and that the `: string` return type must stay.
- **Published on jsr.io:** 13 packages, not the 10 the goal named. This took three Publish attempts because of jsr.io outages (see 2.4).
- **Verified after release** with skmtc CLI 0.9.50:
  - `skmtc clone -g @skmtc/gen-zod` gives 0.2.8, whose `base.ts` calls `ZodBase.toIdentifierName`.
  - gen-zod 0.2.7 and 0.2.8 produce byte-identical output from the same OpenAPI schema.
  - The published generators resolve to one copy of each `@skmtc` package, including core 0.29.0.
- **Follow-up issues filed by the reviewer:**
  - skmtc/skmtc#175: core should pass the identifier name to `toExportPath`, or dispatch through the class.
  - skmtc/skmtc#176: the docs, the skmtc-model skeleton, SKILL.md and the CLI scaffold templates still teach `this.toIdentifierName`.
  - #67: the release script should write or check the version cascade in the repo.
- **Delivery comment on #64:** https://github.com/skmtc/skmtc-generators/issues/64#issuecomment-5877533062

**Figures:**

| Measure | Value |
| --- | --- |
| Duration | 47m 51s |
| Input tokens (uncached) | 208 |
| Output tokens | 63,841 |
| Estimated cost | $1.28 (Orbital reference prices; real cost is higher because cached input is excluded) |

## 2. What was surprising or problematic

1. **`implement` skipped the workspace-invariant package, and CI went red.** I ran `deno check` and `deno task test` in "all 16 workspace generators" and reported them green. The workspace has 17 members. The 17th, `test-support`, holds the test "a pin on another workspace generator names its current version". The first round had bumped gen-typescript, gen-zod and gen-valibot to 0.2.8 but left gen-express, gen-msw and gen-supabase-hono pinning 0.2.7. So `coverage (test-support)` and `tests-windows (test-support)` failed on the PR. My loop listed generator directories by hand and left out the one package that exists to catch exactly this. The reviewer found it.
2. **The goal's "only the 10" conflicted with the repo's release model.** `.scripts/release.ts` cascades: when a dependency releases, every published dependent has its pin rewritten and its patch bumped in CI, and nothing is committed back. With only the 10 bumped, the dry run planned gen-express, gen-msw and gen-supabase-hono as `cascade 0.2.7 -> 0.2.8`. None of the options kept to "only the 10":
   - accept the cascade, and the repo drifts from jsr.io;
   - bump the three by hand;
   - move their pins without a bump, which fails the invariant in 2.1.

   In `implement` I kept to the goal, flagged the conflict, and left the three untouched. That produced the red CI in 2.1. The ticket's own wording ("update the exact pins between stock generators") already implied the three dependents. The goal's narrower phrasing is what made it look like a choice.
3. **A `deno.lock` regeneration pulled in unrelated churn.** To drop the stale 0.2.7 entries in `address`, I ran `deno install`. It also pruned unrelated specifiers (`jsr:@std/log@0.224`, `jsr:@std/path@1`) and rewrote a dependency line. I restored `deno.lock` from `origin/main` and let `deno check` in the affected packages re-add only what changed. The final diff against `main` was the moved pins only. This cost one extra round trip.
4. **jsr.io outages took three Publish attempts.**
   - Attempt 1 failed in the registry lookup (`502 Bad Gateway` on `gen-tanstack-query-fetch-zod/meta.json`), and nothing was published.
   - Attempt 2 failed while fetching publishing status (`500 Internal Server Error`) after gen-arktype@0.2.7 had actually uploaded. So a "failed" run left a partial release.
   - Test Coverage's `tests-windows (gen-kotlin-jackson)` also hit a 502 on `lang-kotlin/meta.json`.
   - Attempt 3, after two minutes of clean probes, published the other 12.

   The script's "registry check skips what is already up" design made the retries safe. The user asked mid-step whether jsr.io has a status page. I found none: `status.jsr.io` doesn't resolve, `jsr.io/status` is 404, and the FAQ links to none.
5. **Deno's 24-hour minimum dependency age blocks fresh releases.** In `follow_on`, a plain `deno install` of gen-tanstack-query-fetch-zod@0.2.9 in a fresh project failed with "blocked by the minimum dependency age policy". It needed `"minimumDependencyAge": "0"`. `skmtc clone` and `skmtc install` were not affected. The repo's root `deno.json` already sets `"minimumDependencyAge": "0"`, so nothing inside the repo shows this. Users installing with plain Deno in the first day after a release will hit it.
6. **The self-reference trap is real, but only one annotation guards it.** The reviewer reported that `FetchBase` referenced in its own initializer compiles only because of the type argument or the return type. In `address` I found it's specifically the `: string` return type. Dropping it gives TS7022/TS7023 even with `<EnrichmentSchema>` kept. Dropping only the type argument still compiles. The ticket said "`deno check` passes", which was true, but it hid the fact that a clone dropping one annotation turns the base into `any`. The comment in each base now documents it. The real fix is in core (skmtc/skmtc#175).
7. **`gh issue view` printed nothing again.** In `implement`, `gh issue view 64 --repo … --comments` returned empty output with exit 0, and `--json title,body,comments` worked. The #52 and #56 retros report the same thing.
8. **`gh run list --branch main` printed 2025 runs first.** In `ci_main`, `gh run list --branch main --limit 6` listed only runs from 2025-11-13 and missed the merge commit's runs. `gh run list --commit <sha>` found them straight away. The #56 retro reported stray SHAs from the same command.
9. **A British spelling in my own commit message.** 3d88123 said "Behaviour", although the repo's CLAUDE.md requires US English. The reviewer flagged it, and the merger fixed it in the squash message. It's small, but it's a rule I had in context.

## 3. Prevention and mitigation

| # | Problem | Owner | Change |
| --- | --- | --- | --- |
| 1 | Skipped `test-support` | Agents | Loop over the root `deno.json` `workspace` array, not a hand-typed list of generator directories. Report "N of N members". |
| 1 | Skipped `test-support` | Repository | Add a root task, for example `deno task test:all`, that runs every workspace member's test task. The root `test` task covers only 4 generators (see #59). |
| 2 | Goal narrower than the release model | Workflow / ticket | When a ticket bumps packages that others pin, list the dependents explicitly, or say "and every published dependent". The goal writer should copy the ticket's wording rather than restate a count. |
| 2 | Goal narrower than the release model | Agents | Run `JSR_URL=https://jsr.io/ deno task release --dry-run` in `implement`, and treat any `cascade` line as a failure to fix, not a note to flag. |
| 2 | Goal narrower than the release model | Repository | #67: a test-support assertion that the release plan has no cascade entries after the direct bumps would have caught 2.1 and 2.2 in one place. |
| 3 | Lockfile churn | Agents | To update `deno.lock`, restore it from `origin/main` and run `deno check` in the affected packages. Don't run a bare `deno install` at the root. |
| 4 | jsr.io outages | Repository | Add a retry with backoff around `registryState` and `deno publish` in `.scripts/release.ts` for 5xx responses. The script is already safe to re-run, so an in-process retry is cheap. |
| 4 | Partial publish on "failure" | Agents | After a failed Publish run, check jsr.io for each planned version before re-running. Attempt 2 had uploaded one package despite failing. |
| 5 | Minimum dependency age | skmtc docs | Say in the install docs that plain Deno blocks versions under 24 hours old, and point to `--minimum-dependency-age` or the `deno.json` setting. |
| 6 | Load-bearing annotation | Core | skmtc/skmtc#175. Until then, the base comments added in b76d60a. |
| 7, 8 | `gh` traps | Agents / workflow | Read tickets with `gh issue view <n> --json title,body,comments`. Find CI runs for a merge with `gh run list --commit <sha>`. The workflow prompts for `implement` and `ci_main` could name these commands. |
| 9 | Spelling | Agents | Grep commit messages for common British forms (`-our`, `-ise`) before committing, as for prose. |

## 4. What worked well

- **The release dry run showed the cascade before merge.** `JSR_URL=https://jsr.io/ deno task release --dry-run` is read-only and exactly predicts what `publish.yml` will do. It exposed the cascade in `implement`, and it confirmed "13 direct, no cascade" after `address`. It should be a standard step whenever a PR bumps a version.
- **Precise review with reproductions.** The reviewer named the failing test, the two failing CI jobs, and the five stale pins by file. They reproduced the TS7022 trap against lang-typescript 0.12.22. Every finding in this PR's scope was fixed in one `address` round. Out-of-scope findings became three issues (skmtc/skmtc#175, skmtc/skmtc#176, #67) rather than scope creep.
- **Narrowing a review claim before acting on it.** The reviewer said the circular reference compiles because of "the type argument or the return type". Testing each separately showed only the return type matters. So the comment says exactly what to keep.
- **Checking jsr.io state before each Publish re-run.** Confirming nothing had published before attempt 2, and finding the partial upload after it, made every re-run safe.
- **Byte-identical output as the behavior proof.** The ticket said "behaviour doesn't change". Generating from one schema with installed 0.2.7 and cloned 0.2.8 and running `diff -r` proves that directly for the released artifact, beyond what the repo's tests show.
- **Retro-only PRs skip CI (#62).** This PR shouldn't start the test matrix or Publish.

## 5. Where the effort went

| Step | Time | Output tokens | Cost | Worth it? |
| --- | ---: | ---: | ---: | --- |
| implement | 19m 36s | 10.8k | $0.22 | Partly. The 11 edits and 10 bumps were mechanical. Most of the time went on reading `.scripts/release.ts`, the dry run and the full check-and-test loop. The analysis found the cascade but stopped at flagging it, and the loop missed `test-support`, so a second round was needed anyway. |
| check | 3m 24s | 16.2k | $0.33 | Yes. The most tokens of any step. It re-verified the TS7022 claim in three more bases and filed three well-scoped follow-up issues. |
| ci_main | 10m 55s | 8.3k | $0.17 | Yes. The time was waiting on jsr.io and two re-runs. Without it, only gen-arktype would have shipped. |
| address | 2m 50s | 9.8k | $0.20 | Yes. It fixed CI, removed the cascade and documented the trap. The lockfile detour (2.3) was about a tenth of it. |
| review | 7m 01s | 3.1k | $0.06 | Very high value per token: it found the red CI and the release drift. |
| follow_on | 2m 10s | 7.2k | $0.14 | Yes. The clone, the byte-identical diff and the single-copy resolution check covered every "done when" item. It also surfaced the 24-hour age block (2.5). |

The costly avoidable part was the second implementation round. Had `implement` run all 17 members and treated a `cascade` line in the dry run as a failure, the PR would likely have been green on the first review. That would have saved the `address` round and most of the review's findings, roughly $0.25 and 10 minutes.
