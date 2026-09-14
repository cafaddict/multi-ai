# HARD: investigate a lost wakeup

A queue intermittently loses wakeups. The Lead chooses competition because two
independent root-cause hypotheses could change the synchronization design.

Apply [SKILL.md](../SKILL.md) and [competition.md](../prompts/competition.md).
Freeze the same base commit, allowed interfaces, regression reproducer and stress
test method. Fill independent Engineer specs `$specA` and `$specB`, each with its
own result-file path as in the [NORMAL example](normal.md).

Read `$laneA` and `$laneB` from policy.yaml's competition.lanes primary_family
and alternate_family primary routes. With current defaults these are Codex and
Claude. These objects contain all three launch fields; no model is inferred.

```powershell
$tag = [Guid]::NewGuid().ToString('N').Substring(0, 8)
orca orchestration run-create --objective 'Resolve the queue lost-wakeup defect' --json
orca orchestration worker-start --spec $specA --worktree new-child --name "queue-a-$tag" --base-branch $baseCommit --agent $laneA.agent --model $laneA.model --effort $laneA.effort --setup inherit --json
orca orchestration worker-start --spec $specB --worktree new-child --name "queue-b-$tag" --base-branch $baseCommit --agent $laneB.agent --model $laneB.model --effort $laneB.effort --setup inherit --json
```

Use the installed guide's supervision loop. Once both initial results are frozen,
fill two review specs with the opposing hypotheses and exact candidate commits.
Resolve `$reviewerA` against A's actual maker family and `$reviewerB` against B's.
Use the exact returned worktree selectors and distinct review report paths.

```powershell
orca orchestration worker-start --spec $reviewSpecA --worktree $worktreeA --agent $reviewerA.agent --model $reviewerA.model --effort $reviewerA.effort --json
orca orchestration worker-start --spec $reviewSpecB --worktree $worktreeB --agent $reviewerB.agent --model $reviewerB.model --effort $reviewerB.effort --json
```

Suppose A removes the observed lost wakeup but B fails the stress test. The Lead
reproduces that evidence and records why A satisfies the requirements and B does
not, including review findings. Two confident answers cannot outweigh the failure.
If neither is adequate, request revision or reject both. Combining their fixes
would produce a new candidate requiring the shared policy's review/checks.
