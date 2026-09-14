# Local Orca contract

Inspected 2026-09-14 on Windows / PowerShell 7.6.6. Runtime
`status --json` reported **1.4.202**, ready, with
`orchestration.contract.v1` and `orchestration.worker-launch-preferences.v1`.
The installed executable was under the user's Orca `resources/bin` directory.
The repository had one empty initial commit and no existing instructions.

## Discovery is authoritative

Resolve the executable once: use ORCA_CLI_COMMAND if set; otherwise orca-dev
when ORCA_DEV_REPO_ROOT identifies a dev session; otherwise orca on Windows.
Substitute that executable in the examples below. Do not switch binaries after
an error. This V1 targets local Windows; it needs no remote host, WSL, or serve.

```powershell
orca --help
orca status --json
orca skills get orca-cli
orca skills get orchestration
orca orchestration worker-start --help
orca agent-context --json
```

If the app is stopped, `orca open --json` launches Orca itself. If required
commands are absent, report the unsupported capability. Do not build a fallback
runtime. Capability names, command help, and the bundled guides outrank this
dated note. Orca's installed guide references are loaded with, for example:

```powershell
orca skills get orchestration --reference references/placement-and-remote.md
orca skills get orchestration --reference references/coordinator-loop.md
```

Load the first for new worktrees, the second for model selection/reuse.
Load `references/recovery-and-cleanup.md` before uncertain lifecycle recovery,
and `references/messaging-and-gates.md` for decision gates.

## Verified native surface

All names/flags below were inspected through installed help or agent-context.

| Need | Native interface and distinction |
| --- | --- |
| Runs | `orchestration run-create --objective`, `run-current`, `run-list`, `run-show --id`, `run-use --id`; durable namespace, no scheduler |
| Tasks | `task-create --spec`, `task-list --run`, `task-update --id --status`; supported statuses: pending, ready, dispatched, completed, failed, blocked |
| Start | `worker-start --spec` or `--task`; composes placement, readiness, dispatch and supervised ownership |
| Placement | `--worktree current`, exact selector, or `new-child --name --base-branch`; use full `id:<repo-id>::<path>` from receipts |
| Model | `--agent codex` / `claude`, optional `--model`, `--effort`; effort requires model; neither combines with `--terminal` |
| Low-level dispatch | `dispatch --task --to --inject` exists but leaves operator-created processes unsupervised; unnecessary for V1 |
| Inspection | `worker-show --dispatch`, `worker-read --dispatch --source auto`, `worker-list --run` |
| Wait/check | `check --wait --types "worker_done,escalation,question" --timeout-ms 30000`; process whole FIFO delivery then `--ack` |
| Completion | `send --type worker_done --task-id --dispatch-id --outcome succeeded\|failed`, from the live dispatched context; no standalone worker-done verb |
| Supervision | `send --to dispatch:<id>`, worker `ask`, coordinator `reply --id --body` |
| Gates | `gate-create --task --question`, `gate-resolve --id --resolution`, `gate-list --run`; a task decision, not a Git merge lock |
| Resources | `worker-release`, `worker-retain`, `worker-stop`, `worker-abandon`, each `--dispatch`; different lifecycle meanings |
| Worktree cleanup | `worktree rm --worktree`; separate from worker release; may also delete a branch proven merged |
| Merge | No dedicated merge command found in the 234-command registry; `merge_ready` is a message type, not integration |

Retired `coordinator-start` / `coordinator-stop` are not a service to launch.
Do not use `orchestration reset` as routine cleanup. There is no run-complete
verb here; accepted worker settlements plus explicit decisions/resource cleanup
finish the goal. Do not fabricate one.

## Native coordinator loop

Run inside the Lead's own Orca terminal. JSON commands return envelopes:
inspect exit status and `ok` before reading `result`. Copy IDs from actual
receipts; do not guess their nested field names or derive handles from titles.
A fresh goal gets `run-create`; resume the correct existing Run with
`run-current`, `run-show`, and `run-use`, not a duplicate Run.

```powershell
orca orchestration run-create --objective 'Implement and independently verify the requested change' --json
# $spec is the filled dispatch template, including role and acceptance evidence.
orca orchestration worker-start --spec $spec --worktree current --agent codex --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 30000 --json
```

Record returned Run, Task, Dispatch and worktree identities in native specs/mail.
Launch calls may be sequential; start every independent lane before the first
wait. Never have two implementation workers edit the same checkout.

For each Delivery, process **all** rows, including status/result messages.
Verify completion's authoritative Dispatch and Task. Answer questions with
`reply`. After an accepted settlement immediately release, or reuse for an
already-defined follow-up with `worker-start --task --terminal --worktree`.
Only user-requested retention calls for `worker-retain`. Released output remains
inspectable through `worker-read`; release does not remove code/worktrees.

```powershell
# Variables here are copied from this Run's actual receipts.
orca orchestration worker-read --dispatch $dispatchId --source auto --limit 100 --json
orca orchestration worker-release --dispatch $dispatchId --json
orca orchestration check --ack $deliveryId --wait --types "worker_done,escalation,question" --timeout-ms 30000 --json
orca orchestration worker-list --run $runId --terminal-state reclaimable --json
```

A valid worker_done already settles the Task; do not also mark it completed.
No output, timeout, heartbeat, or TUI idle is settlement. After three empty
waits enumerate `worker-list --run`, inspect liveness and literal next actions;
preserve `unverifiable`. On failed/unknown start, inspect failedStage,
residualResources and recovery instructions instead of repeating worker-start.
Do not invent retries or infer process exit. Read bounded output with returned
cursors and heed clipping/contentComplete warnings.

Before finishing, settle or report every expected attempt and resolve every
reclaimable terminal. A release exit code of zero can still mean retained or
release_pending; inspect the receipt. Follow uncertain-release recovery; never
substitute terminal close. Remove only a run-owned worktree after confirming
the exact selector, clean state, no live owner, and preserved candidate/evidence.
Keep unmerged alternatives unless their deletion is authorized. Never use
`--force` merely to make cleanup pass.

## Policy boundaries

Schemas and roles are not automatically enforced by worker-start. The installed
worker-start has no schema-validation flag or read-only role flag. V1 supplies
instructions and checks source cleanliness; it inherits the configured agent
permissions and does not claim sandbox enforcement.

Orca supports deeper graphs, remote placement and other providers. V1 uses
local workers, two provider families, and one generation only. No paid worker
was launched during repository development.
