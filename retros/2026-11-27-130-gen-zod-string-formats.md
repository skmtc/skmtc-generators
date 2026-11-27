# Retro: #130, gen-zod checks a string's format and pattern

## 1. Summary

#130 asked gen-zod to write Zod 4's check for each string format Zod 4 knows and a `.regex()` for a pattern. It also asked for the list of formats in one file for #132, and for the six dependents to be pinned and patch-bumped. All of it was delivered in PR #133, merged as fb02562. gen-zod 0.5.0 and the six dependents are on JSR. The follow-on step rendered the GitHub REST document (1016 files) and every file compiled and loaded on zod 4.1.12 and 4.6.7.
The run took 26m 43s: 20,391 input, 14,570,174 cached and 95,017 output tokens, $7.91 estimated. `implement` cost the most ($3.57, 10m 41s), and it was worth it: the format table, the fixture on two zod versions and the version bumps all landed in one pass. One review round followed (uuid). `check` cost $1.03, most of it on a Coveralls status that is not a gate.

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| `formats.ts` mapped `uuid` to `z.uuid()`, which checks RFC 9562's version digits and refuses valid JSON Schema uuids. The reviewer caught it; my fixture's only passing uuid was a v4. | 1 review round: address 2m 14s plus part of check's 5m 17s, about $1.20 | check | In `test-support/mod.ts`, take the passing and failing values of `stringFormatCases` from JSON-Schema-Test-Suite's `format` tests, not from values the author picks. #132 reuses the fixture, so it gets the same cases | triage |
| The rethrow in the copied `tryRegExpLiteral` is unreachable, so Coveralls gen-zod went red (−0.06%). The check step spent time on it and added a `deno-coverage-ignore` commit; the status stayed red. | most of check's 5m 17s, about $0.80 | check | Export `toPatternLiteral` from `@skmtc/lang-typescript`, so the branch is covered once there and not in each validator | triage |
| CLAUDE.md rule 3 says "copy no helper file between packages", but the ticket said to copy gen-effect-schema's pattern code. The self-review raised the conflict and the reviewer re-read and dismissed it. | one self-review finding and one reviewer finding | steering | Same fix as the row above. Until it lands, add to the CLAUDE.md rule: "until lang-typescript exports a helper, copy its functions into the class file and say where they come from" | triage |
| `test:typecheck` is the only test that parses values through the generated code, and CI does not run it. The offset and uuid traps are caught only when someone runs it by hand. | none this run; a risk for #132 | check | Add a job to `.github/workflows` that runs each validator's `deno task test:typecheck` | triage |
| `formatSchemas` began as a plain object, so the format `constructor` read `Object.prototype`. A unit test written for that trap caught it before the commit. | about 1 minute | review-rule | Reviewer rule: a lookup keyed by text from the document uses a `Map` or `Object.hasOwn` | triage |
| In follow_on, Deno's default 24-hour `minimumDependencyAge` refused the just-published `@skmtc` packages in the scratch project. | about 1 minute | information | Say in the skmtc-cli skill that a new release cannot be resolved for 24 hours on Deno's default, and name the setting that excludes a package | triage |

## 3. Keep

- Write a "remove the line, see the test fail" check for each trap the ticket names, such as offset date-times and version-0 uuids. This is already in the workflow prompt; keep it.
- Run one typecheck test per zod version in a loop over `[ZOD_4_1, ZOD]`. Write it down in gen-zod's test header, so #132 copies it for its own libraries.
- Bump versions with one script that fails on any miscount. This already matches the user's CLAUDE.md exception.

## 4. Deferred

- `gen-zod/src/ZodString.ts` `toPatternLiteral`, and its source in gen-effect-schema `EffectString.ts`: when a pattern compiles only without the `u` flag, the no-flag version silently changes the meaning of `\p{…}`. Example: `^\p{L}+\-\d$`. A user meets it with any document whose pattern mixes `\p{…}` and `\-`. Source: https://github.com/skmtc/skmtc-generators/pull/133#issuecomment-7222410184
- gen-shadcn-form: an optional format field (`z.url().optional()`) may refuse `''` from a cleared input, which blocks submit. Not reproduced. Form users meet it once they upgrade to 0.3.28. Source: the same comment.
- CI does not run `test:typecheck` (see Findings).
- `gen-shadcn-form/src/schemaToField.ts:35` is already over the complexity limit (23), so `complexity.ts` exits 1 for that package.
- gen-zod writes no `.default()`. The ticket leaves this to the owner.
- gen-zod writes no checks for the number formats (`int32`, `int64`, `float`, `double`). Out of scope per the ticket.
- On the GitHub document, the output holds 23 more `z.url()` and 19 more `z.iso.datetime` than the follow-on step's keyword count. The step did not trace why; it probably came from the count, which took only schemas with `type: string`.
- Users on Deno's default `minimumDependencyAge` cannot resolve gen-zod 0.5.0 or its dependents for 24 hours after a release.
