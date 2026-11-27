# Retro: #129, one form for a union in a cycle, on core 0.52.0

Run `2026-11-27-ifdjy3` of `implement-ticket-dg`. PR #135, squash-merged as `ab45e34`.

## 1. Summary

#129 asked for three things: a gen-zod rule that renders `z.union` when a member of a union is in the union's own cycle, a move of every generator to the newest core, and the rename to the core 0.49 config names.
All three were delivered: core 0.52.0, lang-typescript 0.15.8, lang-kotlin 0.11.42, a patch bump for each generator, and `settings.parse` in `skmtc.config.json`.
#133 merged first, so gen-zod and its six dependents took the next free versions (gen-zod 0.5.1).
The review was clean, CI on main was green, and every package except the two Kotlin ones is published.
follow_on ran the measurement on the real documents. Files that differ between the two schema orders went from 1 to 0 on Cloudflare and from 3 to 0 on Microsoft Graph.
The run took 32m 10s: 17,234 input tokens, 16.65M cached, 105,038 output, about $9.34.
`implement` cost the most ($5.85, 19m). About half of that time went to the release work across 18 manifests and 22 rename files, which was worth doing, but most of it was edit mechanics (finding 1).

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| `implement`'s prompt bans every scripted edit, so it needed about 60 Read and Edit calls: 18 `deno.json` pin and version bumps, 22 rename files, and 7 rebase conflict resolutions. The user's CLAUDE.md allows a checked script for a repetitive change to code. | ~8 min, a large share of 11.1M cached tokens | steering | implement-ticket-dg `implement` prompt: allow the CLAUDE.md exception (a quoted-heredoc script that fails on 0 or extra matches, then `git diff`) for manifests and code | triage |
| The skmtc lint plugin is silent under `~/.orbital/worktrees`. In `implement`, `deno lint` reported false `ban-unused-ignore` errors, and an earlier "lint passes" in gen-zod meant nothing; a `/tmp` worktree was needed. This is the 4th retro to log it (#56, #113, #121). | ~3 min, 3 extra worktrees | check | `@skmtc/lint-plugin`: match the path relative to the workspace root, or have Orbital create worktrees outside a dot-directory | triage |
| #133 merged while `implement` ran. The final rebase conflicted in 7 `deno.json` files and `deno.lock`, and the pins were redone to 0.5.1, 0.3.29, 0.2.30 and 0.2.31. The goal had foreseen this. | ~4 min | workflow | orbital-delivery-lead: do not run two tickets that bump the same packages at once; queue the second behind the first | triage |
| CLAUDE.md step 5 and finish.md require `complexity.ts` to exit 0 for each changed package. A release that bumps every package cannot meet that: 5 packages already exit 1 on main. | ~1 min, an unmet rule reported as such | steering | repo `CLAUDE.md` step 5: apply the rule to packages whose `src/` changed, not to packages changed only by a version bump | triage |
| The ticket's counts (184 tests, 8 typecheck tests, 29 grep lines) were stale once #133 merged (204, 11, 28), so each count had to be explained instead of checked. | <1 min | ticket | orbital-ticket-prep: state a "done when" count as "the base's count plus N new" | triage |
| The `/code-review` fork claimed that `recursiveBody.test.ts` would fail once core drops `settings.system`. A mutation showed the test does not depend on `danglingRefs` at all. | ~1 min | review-rule | code-review instructions: check a failure scenario by mutation before reporting it as fact | none: one-off, low cost |

## 3. Keep

- Each rule line was removed in turn to prove its test fails (4 mutations), and the forwarding of the new config key was proved the same way. The `implement` prompt already asks for this.
- follow_on ran the measurement that `implement` could not (both schema orders, real documents, each file loaded first on zod 4.1.12 and 4.6.7), against the published packages. Write this into the follow_on prompt for tickets whose "done when" names a measurement.
- Before renaming `settings.system`, `implement` read the released core source (`CoreContext.ts:792`) to confirm the deprecated alias still works, rather than trusting the release notes, which did not exist. This belongs in the skmtc-generator skill's "Signatures" rule.

## 4. Deferred

- `test-support/mod.ts` `runE2eFixture({ system })`, `gen-md-docs/test/helpers/toParsedDocument.ts` and the intersection tests keep the parameter name `system`, which mirrors core's `ParseContext`. The next person who renames the config would meet it.
- `gen-zod/src/discriminated.ts` comment, "The rule takes every member of the cycle": inline object members whose properties lead back into the cycle are not refused. The reviewer dropped this because nobody reproduced it (no TS7023 seen); it predates #135, and anyone who documents the rule would meet it.
- The `deferred` and `inCycle` fields of `gen-zod/src/ZodRef.ts` always hold the same value. Both the author and the reviewer dismissed this, and anyone who later changes one field without the other would meet it.
- `deno fmt --check` fails for 33 files in gen-zod on main, `ZodRef.ts` among them, and no CI job runs it. Any PR that runs fmt would meet it.
- `complexity.ts` exits 1 on main for gen-arktype, gen-kotlin-jackson, gen-md-docs, gen-msw and gen-shadcn-form. Any run that follows finish.md would meet it.
- Microsoft Graph cycle files fail `deno check` with 8 TS2589 errors ("excessively deep") at `microsoftGraphDriveItem:34`, `microsoftGraphListItem:15` and `microsoftGraphOnenoteSection:10`, on both the old and the new stack. Found by follow_on; a user who type-checks Graph output with zod would meet it.
- The non-deduplicated Cloudflare document (`skmtc-rs/bench/specs/cloudflare.json`) produces 0 files, from `Registered definition mismatch` on names that normalize to one identifier and from filenames that differ only in case. Found by follow_on; anyone who generates from the raw Cloudflare spec would meet it.
- gen-kotlin-jackson and gen-kotlin-spring have no public JSR release, so nobody inspected their 0.1.13 and 0.5.13 output after the merge.
- gen-valibot `ValibotProjection` reads `isReferencedBack`, which depends on the order a run enters a cycle, and gen-arktype and gen-effect-schema were never generated in two orders. Out of #129's scope; a partial-run host would meet it.
