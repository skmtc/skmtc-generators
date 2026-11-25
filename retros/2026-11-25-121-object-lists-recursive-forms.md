# Retro: #121 and #122, object lists only and recursive form bodies

## 1. Summary

#121 asked that only a list of objects counts as a list response in gen-tanstack-query-supabase-zod, so gen-shadcn-select and gen-shadcn-table stop failing. #122 asked that gen-shadcn-form does not overflow on a body model that contains itself.
Both were delivered in PR #124 (squash `1f5626b2`). Publish succeeded: JSR has supabase-zod 0.2.28, and form, select and table 0.3.26. In the follow-on sample of 397 documents, 197 failed with "Expected object type" before and none after.
Run `2026-11-25-851xg0` took 41m 10s (39m 24s agent time): 21,467 input, 14,634,690 cached and 125,930 output tokens, about $10.45.
`implement` cost the most money ($4.22, 9m 02s). `review_standard` cost the most time (21m 53s, $3.19). It was worth it: it showed that two of the ticket's three forms could not be submitted.
There was one review round, with two should-fix threads.

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| In `implement`, self-review found that `ShadcnForm` still required a property whose field was cut. The author listed it as "Proposed, not built", and review then proved that forms C and D could not be submitted. | 1 review round: address $0.75 + check $0.55, ~4 min | workflow | `implement` prompt: a finding that makes the ticket's own output unusable is a defect of the diff; build the smallest fix | dmitrigrabov/orbital-workflows#80 (comment) |
| The form tests compare text. No test type checks a generated form or submits it, so the finding above was read from code and left unproven. `follow_on` proved submit by hand with stubs, after the merge. | same round; part of follow_on's $1.19 | check | Add a `test:typecheck` task to gen-shadcn-form that runs `checkGenerated` with field stubs, and list it in `tests-coverage.yml` | triage |
| The author did not search for the catalog and reported it as "not here". Review and `follow_on` found documents under skmtc-root. The tickets' "How often" counts give no path and no command, and the 405-document set was not reproduced. | a few calls in follow_on; counts unproven | navigation | `CLAUDE.md`: name the catalog directory and one command that runs a generator over it; ticket-prep copies both into "Outside facts" | triage |
| #122 fixes a set per path but does not bound the form's size: review measured 131 MB for 10 models that all refer to each other. | no round; deferred | ticket | `orbital-ticket-prep`: a decision that expands a graph per path also states a bound, or says none is needed | triage |
| In `implement`, `deno install` after the version bump added about 60 unrelated oxc-parser lines to `deno.lock`. The author restored the file and let `deno check` write the four pin lines. | ~1 min | steering | `CLAUDE.md`: after a pin bump run `deno check gen-*/mod.ts`, not `deno install`; correct the advice from retro #90 that #121 repeated | triage |
| Seven version and pin lines, plus the lock, were edited by hand in four members. | 4 edits and 4 reads | tool-cost | The `bump` mode of `.scripts/release.ts` | #67 (comment) |
| `skmtc/*` lint rules are silent in `~/.orbital/worktrees`, so lint ran in a `/tmp` copy, as in retros #56 and #113. | ~1 min in implement and address | check | `@skmtc/lint-plugin`: test the path below the workspace root, not the absolute path | triage |

## 3. Keep

- Mutations scripted in a scratch copy of `git ls-files`, one line each: 15 in one call. It found that no test covered the one-member-union branch, and the worktree stayed clean. Add it to the `implement` prompt.
- Before and after runs over catalog documents, in review and `follow_on`: they gave byte-identical proof for the files that should not change. Add it to the review prompt for generators.

## 4. Deferred

Reviewer's deferred findings (https://github.com/skmtc/skmtc-generators/pull/124#issuecomment-7172780667):

- `gen-shadcn-form/src/openModels.ts:27`: a form grows factorially for a dense group of models that refer to each other. No such local document was found.
- `gen-shadcn-form/src/fields/Table.ts:168`, `fields/ObjectInput.ts:40`: a row or object model with every field cut renders an empty table or section. Who: link and join models.
- `gen-shadcn-form/src/ShadcnForm.ts`, `.required(...)`: a body that gen-zod renders as `z.lazy` or `.nullable()` has no `.required`, so the form throws when it renders. Who: nullable bodies, and recursive ones with `additionalProperties`.

Self-review, found and left:

- `gen-tanstack-query-supabase-zod/src/listFns.ts`, and the fetch-zod copy: only the first array is read, so `{ warnings: string[], data: User[] }` has no select or table, and a plain hook. Who: envelopes with a scalar array first.
- Same file: items that are a union of objects are no list, so their hook is now plain.
- Same file: a detail response with an array of objects still counts as a list. Pre-existing.
- `gen-shadcn-form/src/FormFields.ts`: `input` works only for a top-level field; a deeper path replaces the whole parent section.
- `gen-shadcn-form/src/openModels.ts`: a body reached by a pointer into an inline schema (`#/paths/...`) may show one extra level. From reading; not run.
- `gen-shadcn-form/src/fields/ObjectInput.ts`, `Table.ts` `SimpleTableRowRender`: `name` is the global, so a nested section has no heading. Pre-existing.
- `gen-shadcn-form/src/fields/Table.ts`: a table without `x-label` shows the label "undefined". Pre-existing.
- `gen-shadcn-form/src/ShadcnForm.ts`: `defaultValues` and `onSuccess` are declared `required: false`, but the props type shows both as required. Seen in generated output; cause not read.

`follow_on`, failing on old and new main alike in its 397-document sample (from the run's summary, no link):

- "Registered definition mismatch": about 17 of 19 remaining select and table failures and 30 of 37 for hooks, for names such as schema, items, id and meta.
- Files that differ only in letter case fail the run (cPTCode/cptCode, programId/programID).
- gen-tanstack-query-supabase-zod fails on docs-iyzico-com.json with "required.includes is not a function".
