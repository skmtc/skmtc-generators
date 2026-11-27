# Retro for #138: every stock generator on core 0.54.0, and each entry lists its projections

## 1. Summary

#138 asked for a source patch that gives every stock generator entry a `projections` list (gen-md-docs excepted), plus a pin move to core 0.54.0 and a patch bump for each published package. It was delivered in PR #143, merged as 0e75c50 with CI green, and there was one review round with no fixes.

Run `2026-11-27-ojho2e` took 20m 26s and $7.38 est. It used 15.8k input tokens, 12.4M cached and 68.9k output. `implement` cost the most: 8m 16s and $3.33. That was worth it: applying the patch, moving the pins, checking every package and seeing each test fail with its line removed all happened in one pass. `follow_on` ($1.25) added the only real-document evidence: 54 runs, identical before and after.

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| In `implement`, `deno lint` failed with 7 `ban-unused-ignore` errors because `@skmtc/lint-plugin` is silent under `~/.orbital/worktrees` (a dot-directory). Proving this took a base worktree under a dot-dir and a `/tmp` worktree. This is the 5th retro to log it. | ~3 min, 3 scratch worktrees | check | `deno/lint-plugin/src/shared/target.ts`: judge path segments relative to the lint root, not the absolute path | [skmtc#474](https://github.com/skmtc/skmtc/issues/474) |
| The forked `/code-review high` in `implement` raised 5 findings. Two repeated decisions in the ticket's Traps (duplicate list entries, gen-kotlin-spring's list), and a third (the coerced Effect twin) was also settled there. The fork never sees the ticket. | ~1 min triage, unrecorded fork tokens | workflow | implement-ticket-dg `implement` prompt: pass the ticket's Traps and "Not in this ticket" to the `/review` fork as settled decisions | triage |
| CLAUDE.md step 5 asks `complexity.ts` to exit 0 for each changed package. A release-wide change cannot meet that: 5 packages exit 1 on main, so every run compares against the base output by hand. This repeats the #129 retro. | ~2 min, 18 base runs | steering | Repo `CLAUDE.md` step 5: require "no new entry over the limit compared with the base", and name the 5 known packages | triage |
| `projections.test.ts` checks only lists spread in from other generators. Removing a generator's own class (`TanstackColumns`, `PostFn`) passes every test. Both the self-review and the reviewer found this. | 0 rounds; deferred | check | `test-support/test/projections.test.ts`: match each package's `insert*`/`toModelRef` projection identifiers against its own list | triage |
| In `follow_on`, Deno 2.9.8's 24-hour minimum dependency age blocked caching core 0.54.0, which was published the same day. It needed `--min-dep-age=0`. | 1 retry | workflow | implement-ticket-dg `follow_on` prompt: pass `--min-dep-age=0` when verifying packages published in this run | triage |
| In `follow_on`, the first Kotlin run failed every subject because the required `_generator.basePackage` was not set. | 1 rerun | navigation | `gen-kotlin-jackson`/`gen-kotlin-spring` README: put the required `basePackage` enrichment in the first example | triage |

## 3. Keep

- Make a release-wide pin and version bump with one Deno script that checks counts (19/16/2/16) and fails on any mismatch. It took one call where the #113 run needed about 30 Edits. Write it into `.scripts/release.ts` `bump` (#67).
- To show a "done when" test is real, remove the guarded line, run, see it fail, then restore. Already in the workflow prompt.
- `follow_on` compares before and after output hashes across every published generator on real documents. Add it to orbital-ticket-prep's release-ticket Context as the standard proof that output is unchanged.

## 4. Deferred

- `test-support/test/projections.test.ts:59-79`: no check that a generator lists its own projection classes. The author of the next generator that adds a projection meets it. Source: [PR #143 comment](https://github.com/skmtc/skmtc-generators/pull/143#issuecomment-7225024685).
- `test-support/test/projections.test.ts:39-43`: `toImportedGenerators` reads only the top level of `src/` and misses subpath specifiers (`gen-shadcn-form/src/fields/Table.ts` is skipped today, but covered). The next import added from a subdirectory meets it. Same source.
- `gen-effect-schema/src/mod.ts`: a listed `EffectProjection` gives core only the uncoerced path. The coerced twin's file is not predictable before a run. File plan ticket 3 meets it (skmtc#451). The ticket's trap calls it safe.
- `gen-kotlin-spring/src/mod.ts`: its list does not cover the tag API and error-support files it registers directly. File plan ticket 3 meets it, when it trusts a list as complete.
- lithic `openapi.json`: component names that differ only in case or separator (`Address`/`address`, `card_transaction`/`card-transaction`) raise `Registered definition mismatch`, and gen-typescript, zod, valibot, arktype, effect-schema and kotlin-jackson then write no files. This is pre-existing on core 0.52.0 and 0.54.0. Any user with such a document meets it. Source: `follow_on` summary.
- `gen-kotlin-jackson` and `gen-kotlin-spring` are `private` and not on JSR (404). This is pre-existing. Users installing them from JSR meet it. Source: `follow_on` summary.
- Core 0.54.1 was on JSR by the end of the run, while the pins are 0.54.0 as the goal asked. The next release ticket meets it.
- `deno fmt` was not run over the workspace. The files mix quote and semicolon styles, and a later fmt-check gate meets it.
