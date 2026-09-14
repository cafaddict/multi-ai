# HARD: independent solutions, then cross-review

Scenario: a queue occasionally loses wakeups under concurrency. The root cause
is uncertain and two plausible fixes affect synchronization differently.
Competition is justified by independent hypotheses, not extra votes.

The Lead freezes the same full Git baseline, behavioral requirements, regression
reproducer, and stress-test method for both lanes. A benchmark is relevant only
if the task has a measurable performance requirement. Specify inputs, environment,
repetitions and correctness checks; faster incorrect code cannot win.

## Independent wave

Resolve the skill's absolute `$policyRoot`, a clean committed `$baseCommit`,
and an actual `$acceptanceBrief` from the target project before these commands.
The latter contains real reproducer/test commands and expected results, not
a made-up `npm test`. This recipe uses default policy and unique worktree names.

```powershell
$dispatchRules = Get-Content -Raw -LiteralPath (Join-Path $policyRoot 'prompts/dispatch.md')
$engineerRole = Get-Content -Raw -LiteralPath (Join-Path $policyRoot 'roles/engineer.md')
$competitionRules = Get-Content -Raw -LiteralPath (Join-Path $policyRoot 'prompts/competition.md')
$competitionTag = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$commonSpec = @"
$dispatchRules
$engineerRole
$competitionRules
Policy: $policyRoot/policy.yaml
Result schema: $policyRoot/schemas/worker-result.schema.json
Target: only your assigned child checkout; verify initial HEAD is $baseCommit.
Change: investigate and fix the queue's lost-wakeup defect.
Ownership: queue implementation and regression tests; preserve its public interface.
Acceptance and permitted file scope:
$acceptanceBrief
Initial independence: do not inspect sibling code, reports, mail or transcripts.
Return WorkerResult and a committed candidate with base $baseCommit.
Do not merge, push or spawn. Ask the Lead if the contract needs changing.
"@
orca orchestration run-create --objective 'Resolve the lost-wakeup defect through independent evidence' --json
orca orchestration worker-start --spec $commonSpec --worktree new-child --name "queue-a-$competitionTag" --base-branch $baseCommit --agent claude --setup inherit --json
orca orchestration worker-start --spec $commonSpec --worktree new-child --name "queue-b-$competitionTag" --base-branch $baseCommit --agent codex --setup inherit --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 30000 --json
```

Inspect both start receipts. Confirm distinct paths, common base, and completed
setup before acceptance checks. Start both before waiting. Do not resend a failed
or unknown start blindly; use native recovery. If a family is unavailable,
report the incomplete competition and preserve the completed lane.

As each lane settles, inspect its report without showing it to the other lane.
Release its worker and acknowledge the Delivery; code remains in its worktree.
Do not retain an idle terminal for a hypothetical future review. Do not open
cross-review until both initial answers are frozen. An incomplete/blocked lane
is explicitly an incomplete comparison, never a second successful candidate.

## Cross-review wave

After the barrier, record each full candidate commit and shared base. Use
[review.md](../prompts/review.md) and the Reviewer role to fill `$reviewA` and
`$reviewB`: each names the candidate, authenticated maker identity, snapshot,
actual diff location, acceptance criteria and schema. Supply relevant opposing
hypotheses now so each can be tested. Snapshot verification is mandatory.

Use a fresh Codex reviewer on Claude's candidate and a fresh Claude reviewer on
Codex's candidate. The settled competitors may instead cross-review each other
through immediate native reuse when practical; never self-review.

```powershell
# Exact selectors below come from the corresponding start receipts.
orca orchestration worker-start --spec $reviewA --worktree $candidateAWorktree --agent codex --json
orca orchestration worker-start --spec $reviewB --worktree $candidateBWorktree --agent claude --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 30000 --json
```

Both reviews are read-only with stable sources. Release settled reviewers and
process every message before acknowledging. Resolve blocking findings before
any integration, including findings from a candidate the Judge does not select
when they also apply to the selected code.

## Judge, objective check, integration

The Lead uses [judge.md](../prompts/judge.md) to evaluate both candidates. Re-run
the regression and agreed stress tests against each relevant snapshot; inspect
the tests themselves, raw output and exit status. An observed data race or lost
wake-up outweighs a reviewer's confidence or two approvals.

Select the simpler candidate that satisfies requirements with stronger evidence,
or reject both. Record rejected alternatives, review references and every
blocking finding's disposition. Request bounded revision if needed. Synthesizing
parts of A and B creates candidate C: an Engineer implements C, an independent
reviewer reviews C, and the Lead verifies C. A/B approvals do not cover C.

In the integration checkout, after all gates pass, the Lead can use:

```powershell
git status --porcelain=v1 --untracked-files=all
git merge --ff-only $selectedCommit
if ($LASTEXITCODE -ne 0) { throw 'Integration failed; retain candidates and reassess the target' }
git rev-parse HEAD
```

Do not execute that merge until the target is clean, ancestry and review coverage
are verified, JudgeResult permits INTEGRATE, and local integration is authorized.
If fast-forward is impossible or the reviewed base no longer covers the actual
delta, delegate preparation of a new combined snapshot and repeat review/checks.
Never fix conflicts after approval and carry the old approval forward.

Finish by reporting the actual merged SHA and checks. Worker release does not
delete worktrees. Use native worktree cleanup only after preserving evidence,
settling all owners, and confirming safe removal. Keep the unselected branch
unless discarding it was authorized.
