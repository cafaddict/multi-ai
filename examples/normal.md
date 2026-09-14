# NORMAL: one implementation, one independent review

Goal: add `examples/simple.md` documenting a tiny direct edit, then link it from
README. This is a deliberate first multi-agent smoke task; routine documentation
typos would normally be SIMPLE. Acceptance: the new example is accurate, uses no
workers for its SIMPLE task, and its README link resolves.

These are Lead recipes, not a script to paste without inspecting each receipt.
Commands assume default policy, the skill is in the current checkout, Orca is
running, and the baseline is committed. The README's first-task prompt explicitly
authorizes committing V1 first. In other repositories preserve unrelated changes.

## Implement

Inspect the repository and native guides as described in [SKILL.md](../SKILL.md).
Read policy and the Engineer role. Do not change model defaults for this example.
Freeze baseline and construct a complete spec (PowerShell):

```powershell
$policyRoot = (Get-Location).Path
$baseCommit = git rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve baseline' }
$dirty = git status --porcelain=v1 --untracked-files=all
if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Resolve baseline ownership and commit authorized changes first' }
$dispatchRules = Get-Content -Raw -LiteralPath (Join-Path $policyRoot 'prompts/dispatch.md')
$engineerRole = Get-Content -Raw -LiteralPath (Join-Path $policyRoot 'roles/engineer.md')
$spec = @"
$dispatchRules
$engineerRole
Policy root: $policyRoot
Policy: $policyRoot/policy.yaml
Result schema: $policyRoot/schemas/worker-result.schema.json
Target: this assigned checkout, initially at $baseCommit.
Change: add examples/simple.md describing a tiny direct edit and link it in README.md.
Ownership: edit only those two files. No other editor may write this checkout.
Acceptance: the example uses no workers for SIMPLE; README's link resolves.
Inspect the referenced files and the diff. Record checks and exit statuses.
Commit the authorized change locally; report full HEAD and base $baseCommit.
Do not push or merge. Use your live Dispatch ID as actor.id.
"@
orca orchestration run-create --objective 'Add and independently verify a SIMPLE example' --json
orca orchestration worker-start --spec $spec --worktree current --agent codex --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 30000 --json
```

The Lead does not edit during implementation. Match JSON status and completion
messages to the active Dispatch. Inspect the actual diff and report. Release
the settled worker and acknowledge the entire Delivery using [ORCA.md](../ORCA.md).
Copy the Run ID and maker Dispatch identity from real receipts.

For a real task with another editor or changes at risk, replace `current` with
`new-child --name <unique-name> --base-branch <full-base-sha> --setup inherit`.
Use the actual returned checkout path for review and verification.

## Review

The maker has settled. No one writes the source during review. In the assigned
checkout, independently read HEAD and clean status. The values below are
PowerShell variables copied from those observations/receipts:
`$candidateSha`, `$baseCommit`, `$makerId`, `$candidateWorktree` (exact Orca
selector), and `$workerResultJson` (the authenticated result body).

```powershell
$reviewRules = Get-Content -Raw -LiteralPath (Join-Path $policyRoot 'prompts/review.md')
$reviewRole = Get-Content -Raw -LiteralPath (Join-Path $policyRoot 'roles/reviewer.md')
$reviewSpec = @"
$dispatchRules
$reviewRole
$reviewRules
Policy: $policyRoot/policy.yaml
Result schema: $policyRoot/schemas/review-result.schema.json
Candidate: simple-example. Maker ID: $makerId, codex/openai.
Target: Git commit $candidateSha, base $baseCommit.
Acceptance: examples/simple.md correctly keeps SIMPLE work direct; README links it.
Verify HEAD and clean status, actual diff, relevant source and link existence.
Do not edit source. Use your live Dispatch ID as reviewer.id.
Worker result (claims to verify):
$workerResultJson
"@
orca orchestration worker-start --spec $reviewSpec --worktree $candidateWorktree --agent claude --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 30000 --json
```

This review is read-only by instruction, not an Orca-enforced sandbox. Parse
ReviewResult and verify the reviewer is not the maker, the effective family
differs, the target matches, and evidence supports the verdict.
CHANGES_REQUESTED is a completed review, not code approval. Route fixes through
a new Engineer task; obtain a new review for the new SHA.

## Judge and finish

The Lead independently reads the actual files, checks the link, inspects
`git diff <base> <candidate>`, and checks clean status and HEAD. For this
documentation task, no application benchmark or invented test suite is needed.
Emit JudgeResult with the actual snapshot, review message reference and observed
checks; record it as a native Run status message.

With sequential `current` placement, the commit is already on the working branch:
INTEGRATE means accepting that exact local commit after the gates, not performing
another merge. This branch is a staging checkout until accepted; no other actor
may treat the unreviewed commit as approved. If rejected, leave it explicitly
unaccepted or route a fix/revert task; do not push or silently reset.

For a child worktree, fast-forward the authorized target to the reviewed commit
only after confirming unchanged review coverage and independent checks. Preserve
the exact SHA. Record the resulting HEAD, release settled workers, acknowledge
messages, and inspect the Run for resources still owing a decision.
