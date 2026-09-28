# Retro: #56, wire @skmtc/lint-plugin into gen-fetch-example

Orbital run `2026-09-28-lnr5e2` (`implement-ticket-dg`). It started 2026-09-28 18:56 and had run for 26m 51s when this retro was written. The retro turn itself is not counted in these figures.

## 1. Objective and summary

**What #56 asked for:**
- Add the `lint` block (`"plugins": ["jsr:@skmtc/lint-plugin@0.1.0"]`) to `gen-fetch-example/deno.json`, the only generator that lacked it. `skmtc clone` copies a generator's `deno.json` into the user's project, so clones of gen-fetch-example (the generator the docs use as the example) got no `skmtc/*` lint rules.
- Bump the version to 0.1.2 and let CI publish.
- The ticket said generator code should not change, because the plugin already linted the package clean.

**What was delivered:**
- **PR #57**, squash-merged as `c2eb40a`. It closed #56. It contains:
  - The `lint` block and the 0.1.2 bump (c20f805). No generator code changed.
  - Review follow-ups (d8e913f):
    - A `test-support` invariant, "every member declares the root lint plugins". It fails if a member's `lint.plugins` is missing or differs from the root's.
    - A `deno lint` step in the `coverage` job, for gen-fetch-example only.
- **CI on `main`:** Test Coverage run 36464436213 passed (35 jobs). The new lint step checked 7 files. Publish run 36464436222 released `@skmtc/gen-fetch-example@0.1.2` to jsr.io.
- **Verified after release with the real CLI** (skmtc 0.9.50, Deno 2.9.5):
  - `skmtc init petstore src`, then `skmtc clone petstore -g @skmtc/gen-fetch-example`, fetched 0.1.2, and the cloned `deno.json` has the lint block.
  - A `this.register({})` planted inside `FetchFn.toString()` is reported as `skmtc/tostring-purity`.
  - A clone of 0.1.1 with the same edit reports nothing.
- **Follow-up issues filed by the reviewer:**
  - #58: the plugin specifier is spelled three ways across the ecosystem, and a root/member mismatch crashes `deno lint`.
  - #59: the root `publish`, `check` and `test` tasks have drifted from the workspace list.
- **Delivery comment on #56:** https://github.com/skmtc/skmtc-generators/issues/56#issuecomment-5875988589

**Figures:**

| Measure | Value |
| --- | --- |
| Duration | 26m 51s |
| Input tokens (uncached) | 170 |
| Output tokens | 43,726 |
| Estimated cost | $0.88 (Orbital reference prices; real cost is higher because cached input is excluded) |

## 2. What was surprising or problematic

1. **The lint plugin silently skipped the worktree.** The worktree lives under `~/.orbital/worktrees/…`, and `@skmtc/lint-plugin@0.1.0` excludes every dot-directory except `.skmtc`. So `deno lint` in `gen-fetch-example/` reported "Checked 7 files" whether or not the `skmtc/*` rules ran. A clean result proved nothing. I knew this only from a saved memory note. To prove the rules ran, I copied the package to `/tmp`, planted a violation, saw `skmtc/tostring-purity` fire, and deleted the copy. Without the note, `implement` would have reported "lint passes" on a check that couldn't fail.
2. **A project named `demo` switched off every rule.** In `follow_on`, my first scratch project was `skmtc init demo`. The planted violation was not reported, and for a few tool calls it looked as if the delivered change didn't work. I tested root lint blocks and standalone members before reading the plugin's `src/shared/target.ts`. Its `EXCLUDED_SEGMENTS` set skips any path containing `demo`, `demos`, `example`, `examples`, `scripts`, `test`, `tests`, `fixtures`, `dist`, `coverage` or `node_modules`, and the project name becomes a path segment (`.skmtc/<project>/…`). With a project named `petstore`, everything worked. Users who name a project `demo` or `examples`, both likely names for someone following the docs, silently get no `skmtc/*` rules. No issue was filed for this, because it belongs to the lint-plugin or CLI repo and no step was authorized to file there.
3. **The ticket's "just add the block" hid an ecosystem-wide crash.** The reviewer reproduced `Linter plugin skmtc has already been registered` on Deno 2.9.5. It happens when a workspace root spells the plugin specifier differently from a member, for example the README's bare `jsr:@skmtc/lint-plugin` or the CLI scaffold's `@^0.1.0` against a member's `@0.1.0`. Before this change, a gen-fetch-example clone had no lint block and couldn't crash. Now it can, the same way clones of the other 15 generators in this repo already could. It was right to keep #56 as specified and move the fix to #58, but the ticket didn't anticipate it.
4. **Conflicting claims about workspace lint inheritance.** The reviewer wrote that inside this repo the new block "has no effect, because members already inherit the root's lint plugin". My saved memory note says the opposite: members "do not inherit the root's lint config". Neither claim was tested in isolation during this run. The `follow_on` experiments with a lint-less root didn't settle it either, because they ran under the `demo` path and every rule was skipped. One of the two notes is wrong, and future lint work will lean on whichever an agent reads first.
5. **`gh issue view` printed nothing again.** `gh issue view 56 --comments` and `gh issue view 56 --repo … --comments` both returned empty output with exit 0. `--json title,body,comments` worked. The #52 retro reported the same thing, so this is now a known recurring trap.
6. **A zsh loop posted no replies.** In `address`, I posted the three thread replies with `for pair in "…"; do set -- $pair; …`. zsh doesn't word-split `$pair`, so every call read `/tmp/.md` and failed. The same command then deleted the reply files, so I had to rewrite all three before retrying. That cost one round trip.
7. **Two unexplained SHAs in `ci_main`.** A `gh run list --branch main --limit 2` printed `9c87df3` and `603968b`, which are not on `origin/main`. A re-query with `--json … headBranch,event` showed only `c2eb40a`, `ab90445` and `5c80bd4`. I didn't trace the stray output. It didn't affect the result, but the `ci_main` summary had to flag a number it couldn't explain.
8. **`implement` took 12m 48s for a two-line config change.** It produced only 3.3k output tokens. The wall-clock time is not explained by the work: most likely it was tool latency (the first `deno lint` downloading the plugin and the jsr graph, a cold `/tmp` copy re-resolving imports) plus model turn latency. The figures don't say which.
9. **`deno fmt --check` is still not a gate.** The reviewer noted that it flags `test-support/test/workspace.test.ts`, because the repo follows `.prettierrc.json` (single quotes, no semicolons). This is the third retro in a row to mention it.

## 3. Prevention and mitigation

| # | Problem | Owner | Change |
| --- | --- | --- | --- |
| 1 | Plugin silent in the worktree | Workflow | Put Orbital worktrees under a path with no dot-segment, or have `create_worktree` warn when the repo's lint config uses `@skmtc/lint-plugin`. |
| 1 | Plugin silent in the worktree | Agents | Never take "Checked N files" as proof that plugin rules ran. Plant a known violation and confirm it is reported, and do it on a copy outside any excluded path. |
| 1, 2 | Path-based scope exclusions | lint-plugin repo | Decide scope from segments below the package root (the nearest `deno.json`), not from anywhere in the absolute path. Until then, have `skmtc init` warn on project names that match an excluded segment. File this as an issue in the lint-plugin repo. |
| 2 | `demo` project name | Agents | Use a neutral project name (`petstore`) in scratch verification, and treat "rules didn't fire" as a scope question first. |
| 3 | Specifier mismatch crash | Ticket | When a ticket copies config into many clones, ask what the surrounding project already declares. Tracked in #58. |
| 4 | Inheritance contradiction | Agents | Settle it with a two-member experiment under a neutral path (root with plugin, member without; and the reverse), then correct whichever note is wrong. |
| 5 | Silent `gh issue view` | Agents / workflow | Read tickets with `gh issue view <n> --json title,body,comments` or `gh api repos/<o>/<r>/issues/<n>`. The workflow's ticket-reading prompt could say so. |
| 6 | zsh loop | Agents | In zsh, don't rely on unquoted word splitting. Issue one command per reply, and delete temp files only after checking that every call succeeded. |
| 7 | Stray SHAs | Agents | Always include `headBranch` and `event` in `gh run list --json` output, so every SHA printed can be placed. |
| 9 | fmt not a gate | Repository | As in the #48 and #52 retros: set `fmt` options in the root `deno.json` to match Prettier, then add `deno fmt --check` to CI. |

## 4. What worked well

- **The ticket was precise and pre-checked.** It gave the exact JSON block and the target version, and it said: "Checked 2026-09-28: … `deno lint` reports no problems (7 files), so no code changes are needed." `implement` never had to decide whether to touch generator code.
- **The saved memory about dot-directories paid off.** Without `skmtc-lint-plugin-scope.md`, the worktree's silent lint would have gone unnoticed (2.1).
- **Planted violations as proof.** The same planted-violation technique proved the rules ran three times: in the `/tmp` copy during `implement`, in the real 0.1.2 clone in `follow_on`, and against a 0.1.1 clone as a before/after control. It also exposed the `demo` exclusion. This should be standard for any lint or guard change.
- **Negative checks on the new invariant test.** In `address`, I confirmed the test fails with the lint block removed (`gen-fetch-example: null`) and with a `^0.1.0` spelling, then restored the file.
- **The reviewer reproduced before reporting, and kept scope.** The specifier-mismatch crash and the `publish`/`check` drift came with reproductions and became #58 and #59 rather than being folded into #57. The one finding that belonged in this PR, the missing guard against #56 recurring, was fixed here.
- **Verifying the released artifact, not just `main`.** `follow_on` used the jsr.io package through the real `skmtc clone`, which is the path the ticket was about.

## 5. Where the effort went

| Step | Time | Output tokens | Cost | Worth it? |
| --- | ---: | ---: | ---: | --- |
| check | 2m 44s | 13.0k | $0.26 | Yes. It re-tested the crash's scope (members-only mismatch is safe), filed #58 and #59, and read the CI log of the new lint step. |
| address | 1m 42s | 9.4k | $0.19 | Yes. It added the invariant test and CI lint step and wrote three evidence-backed replies. About a fifth was the zsh retry (2.6). |
| follow_on | 1m 19s | 6.3k | $0.13 | Yes, but about a third went on the `demo` detour (2.2). The detour did surface a real plugin bug. |
| implement | 12m 48s | 3.3k | $0.07 | Cheap in tokens, and the `/tmp` proof was essential. The wall-clock time is unexplained (2.8). |
| review | 5m 09s | 2.3k | $0.05 | Yes. Five findings, each reproduced. |
| Other steps | 3m 09s | 9.5k | $0.19 | Routine: PR, merge, CI watch, ticket comment. |

The ticket's change was two lines. Just over half the cost ($0.45 of $0.88) went to `address` and `check`. That was worth it: the run left behind a guard and a CI step that stop #56 recurring, and two issues for the wider problems. The avoidable costs were small: the zsh retry and the `demo` detour, together about 5k output tokens.
