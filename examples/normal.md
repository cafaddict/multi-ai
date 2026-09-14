# NORMAL: implement, review, verify

Example: fix a reproduced configuration-parsing bug and add its regression test.
The Lead applies [SKILL.md](../SKILL.md), freezes the base and expected behavior,
and fills [dispatch.md](../prompts/dispatch.md) with the Engineer role.

In this PowerShell recipe, `$engineer` is the complete primary route read from
policy.yaml's roles.engineer. `$spec` is the filled task, and `$reportPath` below
is included in it. There is no YAML parser or launcher wrapper in this project.

Reports can live in the repository's shared Git metadata, outside candidate source
and child worktrees. Give every task/revision its own file:

```powershell
$gitMetadata = git rev-parse --path-format=absolute --git-common-dir
if ($LASTEXITCODE -ne 0) { throw 'Cannot locate report storage' }
$reports = Join-Path $gitMetadata 'multi-ai-reports'
New-Item -ItemType Directory -Path $reports -Force | Out-Null
$reportPath = Join-Path $reports ([Guid]::NewGuid().ToString('N') + '.json')
# Fill $spec now, including the allocated $reportPath and the assigned Engineer role.
orca orchestration run-create --objective 'Fix and verify the configuration parsing regression' --json
orca orchestration worker-start --spec $spec --worktree current --agent $engineer.agent --model $engineer.model --effort $engineer.effort --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
```

Use current only with exclusive checkout ownership. Process the result using the
installed Orca guide. The accepted completion references a real WorkerResult file;
read it and compare its worker_id with the Dispatch.

For a Codex maker, resolve `$reviewer` from roles.reviewer.by_maker_family.openai.
For a Claude maker, use the anthropic entry instead. Inspect actual launch receipts.
Fill `$reviewSpec` from [review.md](../prompts/review.md), including the committed
SHA, baseline, maker ID, worker report and a different output report path.
`$candidateWorktree` is the exact selector returned by Orca.

```powershell
orca orchestration worker-start --spec $reviewSpec --worktree $candidateWorktree --agent $reviewer.agent --model $reviewer.model --effort $reviewer.effort --json
```

The Lead reads ReviewResult, independently reproduces the acceptance checks,
then writes JudgeResult. If the reviewer finds a blocker, an Engineer gets a
revision task; a changed commit receives a new review. For current placement,
accepting the already-created local commit is the integration decision. A child
candidate instead uses the authorized Git integration workflow after judgment.
