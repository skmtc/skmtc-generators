# Retro: #61, skip the test and publish workflows for retro-only changes

Orbital run `2026-09-28-i3nc3q` (`implement-ticket-dg`). It started 2026-09-28 20:04 and had run for 16m 21s when this retro was written. The retro turn itself is not counted in these figures.

## 1. Objective and summary

**What #61 asked for:**
- Add `paths-ignore: ['retros/**']` to the `push` and `pull_request` triggers of `tests-coverage.yml` and to the `push` trigger of `publish.yml`. Every delivery ends with a PR and a push that only add `retros/<file>.md`, and each one started 35 test jobs and a release.
- Check this against #54. If the test checks become required, a skipped workflow leaves the required check pending, so a retro-only PR could never merge. In that case, use a job that reports success, or leave the `pull_request` trigger as it is.

**What was delivered:**
- **PR #62**, squash-merged as `98e66bc`. It closed #61. The first commit (b9d2ed5) did what the ticket's Fix listed, including the `pull_request` filter. Review changed the design (af2ef84, 0fa9e31):
  - `tests-coverage.yml`: `paths-ignore: [ "retros/**" ]` on `push` only. `pull_request` stays unfiltered, the ticket's fallback for #54.
  - `publish.yml`: `paths-ignore: ["retros/**"]` on `push`. The header now says a retro-only merge no longer retries a failed release, so re-run it with `workflow_dispatch`.
  - `test-support/test/workspace.test.ts`: two guard tests.
    - `toPathFilters()` reads every workflow file and every trigger. The only path filters allowed are the two `push: retros/**` ones.
    - A second test fails if `tests-coverage.yml` loses its `pull_request` trigger.
- **CI on `main`:** Test Coverage run 36471264664 passed (35/35 jobs). Publish run 36471264654 passed, a no-op because no version was bumped.
- **Verification after merge:**
  - The guard tests passed on merged `main` (11/11).
  - I replayed the filter on the last 12 commits on `main` by their changed files. The three retro commits (#51, #55, #60) would have started no run. Every code commit still runs both workflows.
  - The live skip had not been observed when this retro was written. This retro's own PR and merge are the first real test.
- **Follow-up issue filed by the reviewer:** #63, keep the Coveralls coverage comparison for PRs based on retro-only commits (proposal: `compare-ref: main` on the upload step for `pull_request` runs).
- **Delivery comment on #61:** https://github.com/skmtc/skmtc-generators/issues/61#issuecomment-5876849958

**Figures:**

| Measure | Value |
| --- | --- |
| Duration | 16m 21s |
| Input tokens (uncached) | 170 |
| Output tokens | 48,119 |
| Estimated cost | $0.96 (Orbital reference prices; real cost is higher because cached input is excluded) |

## 2. What was surprising or problematic

1. **`implement` read the #54 check too narrowly, and review had to reverse it.** The ticket says to check against #54 and that a retro-only PR must merge "under the branch rules in force at the time". In `implement`, I queried the live rules:
   - `GET /branches/main/protection` returned 404.
   - Ruleset 18266850 had only `deletion` and `non_fast_forward`.

   Because no check was required that day, I kept the `pull_request` filter and put the #54 risk in a YAML comment. The reviewer's first finding was High: #54 is a settings change, so nothing in the repo notices when it lands, and my guard test even pinned the filter in place. Once any `coverage (…)` check became required, every retro PR would wait forever. `address` removed the filter. The ticket's own fallback was the safer choice all along. I took the literal "rules in force today" reading over the obvious intent of an open, planned ticket.
2. **The runs we skipped did more than the ticket said.** The ticket said a retro push "tests nothing and publishes nothing". Review found three side effects of those runs, none of them in the ticket:
   - **Publish retry.** Each retro push re-ran `release.ts`, which quietly retried a failed release from the merge before it.
   - **Coveralls base builds.** Coveralls compares a PR against the build for its base commit. `main`'s HEAD is usually a retro commit, so after this change most PRs show "FIRST BUILD ON main" and no coverage change. I confirmed this in the Coveralls troubleshooting docs. It became #63.
   - **Toolchain drift.** `deno v2.x` and `actions/*@v4` float, and the retro push re-tested `main` against them. Keeping `pull_request` unfiltered moves that check to the retro PR, but `main`'s HEAD now usually has no status.
3. **Retro PRs would have reported zero checks.** With a filtered `pull_request`, `gh pr checks --watch` exits 1 with "no checks reported". Any delivery automation that waits on checks before merging a retro PR would have failed. The reviewer caught this. `implement` hadn't thought about the consumers of the checks.
4. **`gh issue view` printed nothing, again.** `gh issue view 61 --comments` returned empty output with exit 0. `gh api repos/…/issues/61` worked. This is the third retro in a row to report it (#52, #56, now #61).
5. **`deno fmt` and the repo's style disagree, again.** `deno fmt --check` wants double quotes and `[main]` without inner spaces. The repo uses single quotes in TypeScript and `[ main ]` in `tests-coverage.yml`. I switched the new YAML strings to double quotes so `publish.yml` stayed fmt-clean, and kept `[ … ]` spacing in `tests-coverage.yml` to match its lines. So the two workflows now spell the same filter two ways. Four retros in a row have now raised fmt.
6. **Small shell slips.**
   - `echo =====` in zsh fails with `==== not found`, because zsh treats a leading `=` as a command-path expansion. It aborted a chained command in `implement`.
   - In `ci_main`, I typed a wrong Publish run ID into the handoff and corrected it inline ("36465126654... correction: 36471264654"). That correction then flowed verbatim into every later step's context.
7. **`closingIssuesReferences` was empty right after `gh pr create`.** The body started with `Closes #61`, but the GraphQL field was `[]` for a while. The merge still closed the ticket. It's a lag, not a bug, but it looks like a failure when you check it.

## 3. Prevention and mitigation

| # | Problem | Owner | Change |
| --- | --- | --- | --- |
| 1 | Ticket gave a Fix and a conditional fallback | Ticket | When a fix depends on an open ticket that will change the answer, pick the design that is safe after that ticket lands, or say which to choose. "Under the branch rules in force at the time" can mean merge time or any later time. |
| 1 | Literal reading of today's rules | Agents | When a ticket names an open dependency, design for its planned end state, not just the current one. Any caveat that only lives in a YAML comment is a smell. |
| 2 | Hidden side effects of skipped runs | Ticket / agents | Before removing a trigger, list everything the run does besides its headline job: coverage uploads, release retries, status on HEAD, caches. The ticket can carry that list, or `implement` can build it from the workflow file. |
| 2 | Coveralls base builds | Repository | Tracked in #63. |
| 3 | Zero checks on retro PRs | Agents | When changing triggers, ask who consumes the checks: branch rules, `gh pr checks --watch`, Orbital's merge step. |
| 4 | Silent `gh issue view` | Workflow | Tell ticket-reading steps to use `gh issue view <n> --json title,body,comments` or `gh api`. This has now cost a retry in three runs. |
| 5 | fmt disagreement | Repository | As in the #48, #52 and #56 retros: set `fmt` options in the root `deno.json` (single quotes, no semicolons, matching `.prettierrc.json`), run it once across the repo, then gate CI on `deno fmt --check`. |
| 6 | Shell slips | Agents | Don't use `=`-leading separators in zsh. Copy run IDs from command output instead of retyping them, and fix a wrong value before handing off rather than correcting it inline. |
| 7 | Closing-reference lag | Agents | Check the PR body's `Closes #N` line rather than `closingIssuesReferences` straight after creation. |

## 4. What worked well

- **The live settings check.** Querying branch protection and the ruleset in `implement` gave hard facts for the #54 question. The flaw was only in how I used them (2.1).
- **Adversarial review earned its time.** The 5m 21s `review` found all of 2.1 to 2.3 and turned a latent merge block into a safe design before merge. Nothing a green CI run could have caught.
- **Mutation-style red checks on the guard.** In `address`, I made four breaking edits, and each one failed exactly the intended test:
  - a `pull_request` filter
  - a `merge_group` filter with `**/*.md`
  - a new workflow with `paths: ["gen-*/**"]`
  - removing `pull_request`

  `check` repeated two of them independently. This should be the default for any repo-invariant test.
- **A guard over every workflow, not the named triggers.** The widened `toPathFilters()` asserts the whole set of path filters in `.github/workflows/`. A future filter anywhere has to update the test on purpose.
- **Replaying the filter over history.** The ticket's Done-when can only be seen live after a retro push. Replaying `git diff-tree` for the last 12 `main` commits gave concrete evidence in `follow_on` without creating test PRs.
- **Trade-offs written where the next person will look.** The publish header, the `on:` comment in `tests-coverage.yml` and the PR body each state what was given up. The reviewer turned the one real loss into #63 instead of widening #62.

## 5. Where the effort went

| Step | Time | Output tokens | Cost | Worth it? |
| --- | ---: | ---: | ---: | --- |
| address | 2m 48s | 14.6k | $0.29 | Yes. It changed the design, widened the guard, ran four red checks, looked up Coveralls' base-build rule, rewrote the PR body and answered nine threads. About a third of the cost came from 2.1, which a better first design would have avoided. |
| check | 2m 27s | 11.9k | $0.24 | Yes. It independently re-ran the red checks, confirmed the Coveralls claim and filed #63 with a concrete fix. |
| implement | 1m 25s | 6.9k | $0.14 | Fast, but it shipped the design that review reversed. A few more minutes on the #54 end state would have saved part of `address`. |
| review | 5m 21s | 2.3k | $0.05 | The best value in the run: nine findings, three of them substantive, for five cents. |
| merge, ci_main, follow_on, close_ticket, open_pr | 4m 15s | 12.4k | $0.25 | Routine. `ci_main` spent most of its 1m 46s waiting on the 35-job matrix. |

The whole delivery cost about $0.96 and 16 minutes. Each retro-only push that no longer runs the workflows saves 35 test jobs (17 of them on Windows) and one release run.
