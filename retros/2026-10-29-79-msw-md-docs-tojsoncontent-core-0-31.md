# Retro: #79, gen-msw and gen-md-docs read bodies through `toJsonContent`, on core 0.31.0

Run `2026-10-29-dp3jp2` of `implement-ticket-dg`. PR https://github.com/skmtc/skmtc-generators/pull/80, merged as `d6f7ce9c`.

## 1. Summary

#79 asked for two changes. The first was a whole-repository pin bump to core 0.31.0, lang-typescript 0.12.27 and lang-kotlin 0.11.6, with a patch bump for the 16 published generators. The second moved gen-msw `MockRoute` and gen-md-docs `toContent` from `content['application/json']` to `toJsonContent`. Both were delivered in one review round. Main CI (Publish and Test Coverage) is green.
The run took 47m 02s wall-clock, of which 22m 41s was agent time and 19m 32s was queued for a slot. It used 21,000 input tokens, 11.36M cached tokens and 98,804 output tokens, an estimated $7.69 (forked `/review` sub-agents not included).
The costliest step was `review` ($3.62, 9m 05s). It was worth it: it found the one real test gap, which the author's self-review (`/review high`) had missed. `implement` was next ($2.78, 9m 40s).

## 2. Findings

| What happened | Cost | Kind | The change that prevents it | Issue |
| --- | --- | --- | --- | --- |
| The author's msw tests all used a one-media-type fixture (`toMediaTypeDocument`), so the ticket's rule "examples from `content[json.mediaType]`" was never told apart from "the first key". The reviewer caught it by mutating `MockRoute.ts:51`. The author's line-removal check covered the Content-Type line but not that lookup. | 1 review round (address $0.40 + check $0.27, plus part of review's $3.62) | ticket | In the `orbital-ticket-prep` skill: for every "read X instead of Y" fix, the done-when names a fixture where X and Y differ. The #79 Traps section said this for md-docs only. | triage |
| The core 0.31 bump also changed which body `toSchema()`/`toRequestBody()` pick in five generators the ticket put out of scope (express and hono responses; tanstack-fetch, fetch-example and effect-http requests). Self-review saw only the request side. The reviewer found the response side. | Two deferred findings, no fix in this run | ticket | In the `orbital-ticket-prep` skill: a core-bump ticket lists every caller of each changed core lookup (`grep toSchema\|toRequestBody\|toJsonContent`) and states what each one now emits. | triage |
| A pin-only bump produced 12 failing per-package Coveralls "coverage decreased" statuses. `review`, `check` and `merge` each had to argue them away against PR #75's precedent. | About 3 steps of reasoning, a few minutes | check | `.github/workflows` / Coveralls settings: make the per-package statuses informational, or set a decrease threshold, so they do not show as failing checks. | triage (related: #54, #63) |
| The pin bump touched 19 `deno.json` files. A one-off Deno script did it and failed loudly on any unexpected pin or count. It worked, but every core bump writes this script again (#48, #75, #79). | About 2 min of `implement` | tool-cost | `.scripts/release.ts`: add a `bump-core <core> <lang-ts> <lang-kt>` subcommand that moves the pins, patch-bumps the published members and moves the generator-to-generator pins. | triage |
| The run waited 19m 32s for a slot before `implement` started. | 19m 32s wall-clock | workflow | None: a queue wait is not a defect of this run. | none, capacity not defect |

## 3. Keep

- The ticket's "run each new test against `origin/main` first" trap. Putting main's two source files back showed exactly which tests prove the fix and which are guards. It is already in the `retros/2026-09-28-48…` §2.4 trap list; keep it in ticket-prep.
- Reviewer comments that give a ready test and the mutation that it kills. Address then took 1 minute. This belongs in the reviewer's rules as the standard shape of a should-fix comment.

## 4. Deferred

- `gen-express/src/Response.ts:29` and `gen-supabase-hono/src/Response.ts:30`: on core 0.31 these serve `+json`/`;v=` response bodies, but with `Content-Type: application/json`. A strict JSON:API client of a server generated from the same spec meets this after upgrading to 0.2.11. Source: https://github.com/skmtc/skmtc-generators/pull/80#issuecomment-6504062823 (a).
- `gen-tanstack-query-fetch-zod/src/MutationFn.ts:69`, `gen-fetch-example/src/PostFn.ts:10` and `gen-effect-http/src/BodyStep.ts:21`: they now send `+json`/`;v=`/`*/*` request bodies, but as `text/plain` (fetch with a string body) or `application/json` (Effect). A server that checks `Content-Type` answers 415. Proposed fix: send `toRequestBody`'s `contentType` when it is not `application/json`. Source: same comment (a), and the self-review.
- `gen-msw/src/MockRoute.ts` `toString`: mocks always answer 200 and ignore `toSuccessResponseCode()`, so a 201-only POST or a 204 DELETE is mocked as 200. Client code that branches on `res.status` meets this. It predates #79. Source: same comment (b).
- `gen-msw/src/MockRoute.ts` and `gen-md-docs/src/toContent.ts`: an `application/json` key with no schema shadows a `+json` sibling that has one. This is core's `toJsonContent` rule, and main behaved the same. It would show in documents that list an empty `application/json`. Source: self-review (c, d).
- `gen-msw/src/MockRoute.ts` contentType check: the compare is exact, so a key such as `Application/JSON` or `application/json; charset=utf-8` sends that string as the header. The ticket decided on the exact compare. Source: self-review (f).
- `gen-msw`: no test covers request-body selection under a non-`application/json` key. The ticket says the request body needs no change. Source: self-review (h).
- `@skmtc/core` `JsonContent`: it does not carry the `OasMediaType`, so callers that need examples look the key up again. This would be a core change. Source: self-review (g).
