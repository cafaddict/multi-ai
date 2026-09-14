---
name: multi-ai
description: Route and supervise bounded software tasks through Orca with independent cross-family review, optional competition, and snapshot-bound evidence. Use when asked to lead multi-agent work in Orca; tiny tasks stay direct.
---

# Multi-AI

> Orca is the mechanism. This project is the policy.
> Competition is a policy, not a framework.
> Maker != checker.
> A worker's self-report is not evidence.
> Review approval belongs to an exact snapshot.
> The Judge decides from evidence, not votes.
> The Lead manages complex work; it should not become the default implementation worker.

## 1. Establish context

Read [policy.yaml](policy.yaml) and resolve resource paths relative to this file,
not the task checkout. Inspect the target repository and its instructions.
A live Orca Dispatch preamble means you are a worker: follow its authority,
your assigned role and task, and [dispatch obligations](prompts/dispatch.md).
Do not promote yourself to Lead, create a Run, delegate, or spawn grandchildren.

As Lead, load the installed Orca CLI and orchestration guides, using
[ORCA.md](ORCA.md) for discovery and the native loop. Keep the selected executable.
No raw provider subagents, process launchers, fake Orca state, or alternate
orchestration tools. Missing Orca blocks delegation; direct SIMPLE work can
still proceed. This skill does not expand the user's authorization.

## 2. Route with a reason

Read [Lead](roles/lead.md). State the level, expected acceptance evidence, scope,
and why delegation or independence helps. Use judgment, not a numeric scorer:

- **SIMPLE:** obvious, tiny, low risk. Implement directly and check the result.
  No worker or reviewer ceremony, and no self-issued ReviewResult.
- **NORMAL:** one Engineer, then an independent cross-family Reviewer, then Lead
  verification. Use [normal.md](examples/normal.md).
- **HARD:** uncertain cause, meaningful alternatives, concurrency/memory
  correctness, high blast radius, or low confidence. Use independent Claude
  and Codex lanes and [competition.md](prompts/competition.md).
- **CRITICAL:** explicitly name the severe failure being prevented. Add
  [Architect](roles/architect.md) work when it will resolve interfaces or risks;
  stage independent lanes and objective verification around that uncertainty.
  Extra workers need a reason; CRITICAL is not a headcount.

The Lead coordinates delegated implementation and routes fixes to an Engineer.
Research uses [Researcher](roles/researcher.md). Judge is a responsibility usually
performed by the Lead. If the Lead substantially authors a candidate, assign
independent review and independent judgment of that contribution.

## 3. Dispatch only bounded work

Resolve providers from policy; do not scatter model names in prompts. An existing
Lead stays in its current provider. Before launch verify local CLI availability.
Use only supported model/effort flags; null means omit. Record the effective
provider family and model when observable; use null for an unknown model.
If the backend family is unknown, do not claim cross-family independence.
Record that family as `unknown` and treat cross-family verification as unavailable.

Fill [dispatch.md](prompts/dispatch.md) plus the relevant role and prompt.
Include absolute policy/schema paths (or inline contents), target checkout,
frozen base commit, acceptance commands, edit boundaries, identity, and output
contract. New worktrees do not inherit uncommitted policy files; references must
remain readable outside that checkout. Resolve missing access before dispatch.

Use one Run for the goal. Orca `worker-start --spec` creates Task and Dispatch
together; use separate `task-create` only when planning a real dependency.
Record decisions in Orca task specs/messages, not a local session ledger.
Do not confuse the `parent` task relation with permission to spawn.

Use `current` for sequential work only when there is no other editor or
unrelated change at risk. Otherwise use an Orca child worktree. Competition
implementations always get separate child worktrees from the **same full base
SHA**, verified inside each lane. Read-only lanes may share a stable checkout.
Do not change configured setup behavior silently; setup must finish before
acceptance tests. If an uncommitted change is needed as a baseline, resolve
ownership and commit only authorized changes before isolating workers.

## 4. Supervise and collect

Follow Orca's FIFO delivery/ack and settlement rules in [ORCA.md](ORCA.md).
Start the independent wave before waiting. Wait in bounded intervals and give
the user progress updates. Silence, TUI idle, and a heartbeat are not completion.
After three empty waits inspect the Run's worker list and reported next actions.

Workers send their JSON result as an authenticated Orca status message, then
exactly one `worker_done` using the live preamble. Process every delivered row,
match results to the expected active Dispatch, and check the actual repository.
A JSON result alone does not settle a worker. A settled task does not approve code.
After accepted completion, immediately reuse for concrete follow-up or release;
retain only when the user requested it. Acknowledge the full processed delivery.

## 5. Review the snapshot

Read [review.md](prompts/review.md) and [Reviewer](roles/reviewer.md).
Freeze implementation at a full Git commit; independently read HEAD and
`git status --porcelain=v1 --untracked-files=all`. Require a clean source checkout,
the agreed base, and the actual diff. Run tests against that snapshot and check
cleanliness again afterwards. Testing may create ignored build output; it must
not alter the reviewed source. Inspect claimed command, cwd, exit code, output,
and relevant tests; rerun meaningful checks when practical. Missing required
evidence blocks approval.

Use a fresh reviewer identity different from the maker; prefer the other
provider family. HARD permits each initial competitor to review only the other
candidate after both initial results settle. Never let a maker review its own
code under a new role name. Reviewer edits require a separate Engineer task and
new snapshot/review. A same-family fallback is allowed only when configured;
record why and the lost independence. Never silently downgrade HARD to one lane.

Validate [WorkerResult](schemas/worker-result.schema.json) and
[ReviewResult](schemas/review-result.schema.json). Schemas check structure;
the Lead checks identity, provenance, target equality, evidence, and reality.
Malformed or stale reports require correction, not inferred approval.

## 6. Judge, verify, integrate

Read [judge.md](prompts/judge.md) and [Judge](roles/judge.md); emit
[JudgeResult](schemas/judge-result.schema.json). Rank requirements, observed code,
tests, benchmarks, reproducible evidence, review findings, simplicity, and
self-reported confidence, in that order. No model voting.

Account for every blocking finding by ID: fixed and re-reviewed, still blocking,
or rejected with specific reproducible counter-evidence. The Judge may reject
a finding; it cannot silently omit it or fabricate an APPROVED review.
Findings confined to an unselected candidate stay in the rejected-alternative
reason, with evidence that they do not apply to the selected snapshot. Do not
call a valid finding false merely because its candidate lost.
Missing review, stale target, missing objective checks, or unresolved blockers
prevents INTEGRATE. Limit fix/review rounds using policy; then report the
unresolved decision to the human. Do not create a new Run to evade the limit.

For Git integration, verify the selected commit and clean checkout again,
confirm review and JudgeResult target that exact SHA/base, and repeat the
required objective checks independently. Use the project's authorized local
Git/PR workflow. Prefer fast-forward of the exact reviewed commit. If the target
branch moved, compare ancestry: fast-forward is safe only when the actual
integration delta was covered by review. Otherwise an Engineer prepares the
combined snapshot, which needs new review and tests before integration.
Rebase, squash, cherry-pick, conflict resolution, or Lead synthesis producing a
new SHA all require a new review; old approvals do not transfer.
Plan selection uses a frozen SHA-256 artifact and SELECT, never code INTEGRATE.

Record JudgeResult in the Run with a status message. Verify the integrated
HEAD and checks; report any integration failure without claiming completion.
Use Orca cleanup, preserve evidence and unselected work, and report outcomes,
snapshots, verification, exceptions, and any residual resource ownership.
