# Retro: #151, an open empty object left out of an intersection (PR #152)

## 1. Summary

#151 asked gen-typescript and gen-zod to leave an open empty object out of an intersection. The bug turned `(Record<string, never>) & (X)` into a type nobody could use. The ticket also asked to keep a closed one, to render an intersection with no member as `unknown` / `z.unknown()`, and to release a patch with the dependents repinned. PR #152 delivers this. It merged as 14bcf0d, and JSR lists gen-typescript 0.2.31 and gen-zod 0.6.4. The follow-on ran the published pair over skmtc-hub's real `EnrichmentField`. Only that file changed, and it now type-checks for a consumer.
The run took 29m 42s (27m 03s of agent time). It used 20,155 input tokens, 16.5M cached tokens and 92,011 output tokens, at an estimated $8.73.
`implement` cost the most: 12m and $4.12. Most of that went on reproducing the bug, a core/_schemas before-and-after diff, and tests that I broke on purpose to prove they can fail. That was worth it. `check` cost 7m and $1.34 because it had to fix a red lint CI that `implement` and the review both missed.

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| `deno lint` passed in `implement` and in the review, because `@skmtc/lint-plugin` is silent under `.orbital/worktrees/`. CI then failed `skmtc/single-dispatch` on the module-level `toMeaningfulMembers`, and `check` inlined the filter into each router case (b5422f8). This is the 7th retro that logs it. | ~7m check, 1 red CI round, 1 fix commit | check | `deno/lint-plugin/src/shared/target.ts`: judge path segments relative to the lint root, not the absolute path. | [skmtc#474](https://github.com/skmtc/skmtc/issues/474) |
| The ticket's Fix named a helper (`toMeaningfulMembers` in skmtc-hub's clones) whose shape breaks the repo's `skmtc/single-dispatch` rule and CLAUDE.md item 3. I copied that shape instead of putting the check inline in the router case. | Part of the row above | ticket | orbital-ticket-prep: when a ticket points at code in a clone, check it against the target repo's lint rules and CLAUDE.md, and say where the logic goes (inline in the router case). | triage |
| Self-review found that a new required constructor arg on exported classes breaks a patch release. The workflow's "Proposed, not built" rule sent this 4-line compatibility fix to a review round. | 1 review round, ~2m address | workflow | `implement-ticket-dg` implement prompt: build a self-review fix that keeps a published API compatible with what the ticket's release item says, rather than proposing it. | triage |
| `deno fmt --check` fails on 470 of 540 files on main, so it says nothing about a diff. I spent time checking whether my files were the cause. | ~2m implement | check | Root `deno.json`: set `fmt` options to the repo's style (single quotes, no semicolons per package), or exclude fmt from the checks agents run. | triage |
| `deno task test:typecheck` needs `--allow-run`/`--allow-net`, which this run's permission rule forbids, so `implement` marked it unverified. CI's "Typecheck generated output" covered it after the push. | 0; unverified until CI | information | Workflow context: state that CI runs typecheck, so the author can note "covered by CI" instead of leaving a gap. | none — CI already covers |

## 3. Keep

- Reproducing on a detached origin/main worktree in /tmp and diffing every core/_schemas document before and after made "output changes only where …" exact. Write it in the skill's `references/finish.md`.
- Breaking each guarded line and seeing its test fail. The workflow prompt already asks for it, so keep it.
- The follow-on ran the published old and new pairs over skmtc-hub's real document, which closed the gap the fixture left.

## 4. Deferred

- `gen-typescript/src/TsObject.ts:75`: an open empty object (`type: object`, no `additionalProperties`) renders `Record<string, never>` everywhere, so any document with a free-form `metadata: {type: object}` gets a type that rejects every key. `Record<string, unknown>` would fix the root cause (self-review, implement).
- `Ts.ts` / `Zod.ts` intersection case: a `$ref` member that points to an open empty component is not filtered and still turns the other member's properties into `never`. It shows up in a document that names its empty object as a component (self-review).
- Closed empty member (`additionalProperties: false`): the ticket asks to keep it, and gen-typescript renders `(Record<string, never>) & (X)`, which still makes X's properties `never`. ClosedField in `objectOneOfCycleDocument` shows it (self-review).
- `gen-valibot` and `gen-arktype`: their intersection classes still render every member, and `ArktypeIntersection` throws on an empty member list (seedless `reduce`). Anyone who uses those generators on an EnrichmentField-shaped document meets it (self-review).
- Dropping an open `type: object` member no longer requires the value to be an object: `allOf: [{type: object}]` now renders `unknown`. The ticket chose this rule; review dismissed the finding (self-review, review).
- `skmtc/deno/core/_schemas/cloudflare.json` fails on main with "Registered definition mismatch: BillSubsApiComponentValue", a `component_value` / `component-value` name clash. It hits gen-typescript and gen-zod (implement, follow_on).
- The follow-on used skmtc-hub's local `packages/api/dist/openapi.SkmtcApi.json` from Nov 17, which may be stale. skmtc-hub's own cloned generators were not regenerated (follow_on).
