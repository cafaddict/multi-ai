# Multi-AI: policy for Orca

> Orca is the mechanism. This project is the policy.

A small skill for a human-facing Lead (Codex **or** Claude) to route work,
seek useful disagreement, and decide from evidence. Orca runs the agents and
owns their worktrees, terminals, tasks, messages, and persistence.

**There is no application to install or service to start.** Read
[SKILL.md](SKILL.md) in an agent running inside Orca. Everything here is
Markdown, YAML guidance, or JSON Schema; no runtime code or package dependencies.

## Workflow

```text
Human -> Lead -> routing policy -> worker(s) -> independent review
              -> Judge -> objective verification -> integration
```

| Role | Responsibility |
| --- | --- |
| [Lead](roles/lead.md) | Classify, delegate, verify, decide integration; implement only SIMPLE work |
| [Architect](roles/architect.md) | Read-only architecture, interfaces, risks, alternatives |
| [Engineer](roles/engineer.md) | Implement and test; cannot approve or decide merge |
| [Researcher](roles/researcher.md) | Read-only investigation and reproducible evidence |
| [Reviewer](roles/reviewer.md) | Inspect actual code and tests independently |
| [Judge](roles/judge.md) | Compare requirements and evidence; usually the Lead, not another process |

| Level | Default |
| --- | --- |
| SIMPLE | Lead acts directly; typo, rename, obvious tiny fix |
| NORMAL | One Engineer -> one independent cross-family Reviewer -> Lead verifies |
| HARD | Independent Claude/Codex lanes -> cross-review -> Judge -> objective checks |
| CRITICAL | Architect when useful, independent lanes for explicit uncertainties, cross-family review, objective checks, Lead synthesis |

Competition is a policy, not a framework. Use it for uncertain root causes,
meaningful design alternatives, concurrency, performance, or high blast radius.
Do not use it for mechanical edits. Competitors receive the same requirements
and frozen baseline; neither sees the other's initial answer before both finish.
Concurrent implementation uses separate **Orca** worktrees.

Maker != checker. Prefer a different provider family, not merely a different
model name. A worker's self-report is not evidence. The Lead/Reviewer inspects
commands, exit codes, outputs, diffs, and current repository state.

Review approval belongs to an exact snapshot. Git changes use full commit SHAs
and a recorded base commit. Any rebase, fix, synthesis, or new commit invalidates
the old approval. Plans may instead use a SHA-256 of an immutable artifact.
The Judge decides from evidence, not votes. An unresolved blocking finding
prevents integration unless the Judge rejects that finding with reproducible
counter-evidence recorded by finding ID.

## Configuration

Edit [policy.yaml](policy.yaml), the sole provider/model selection location.
`codex` / `claude` are Orca launcher IDs; family labels are policy guidance.
Models and effort default to `null`, inheriting the user's configured launch
defaults. Set an available model ID there to request a specific launch; inspect
Orca's requested/effective receipt. Do not mistake a requested model for proof.

Changing `lead.provider` changes guidance for the next session, not the running
Lead. Start that CLI (or use its Orca tab). Either Lead reads the same skill.
Reviewer family is resolved against the actual maker, not the Lead.
If a cross-family provider is unavailable, the default is to report a blocker;
the documented same-family fallback must be explicitly configured and disclosed.

Orca does **not** parse this YAML or enforce these JSON schemas. The Lead follows
them; these are review contracts, not a code-enforced merge gate or sandbox.

## Try it

Open a PowerShell terminal inside this Orca worktree. For a first small real task:

```powershell
codex 'Read ./SKILL.md and follow it as Lead. First commit the existing V1 files as the local baseline. NORMAL task: add examples/simple.md showing a tiny documentation fix handled directly without workers, and link it from README.md. Use one Engineer and one independent cross-family Reviewer. Verify the result and integrate locally if approved. Do not push.'
```

For a Claude Lead, use `claude` with the same quoted prompt. No global skill
installation is required. For another project, give the Lead the absolute path
to this SKILL.md and the target checkout; it passes absolute resource paths or
their contents into each task. Root-level SKILL.md is explicitly loaded here,
not assumed to be automatically discovered by either CLI.

The [NORMAL example](examples/normal.md) shows a single implementation and review.
The [HARD example](examples/hard-competition.md) shows isolated competitors.
The [smoke procedure](examples/smoke-test.md) includes checks that make no paid
agent calls. Launching the example task above does use your configured agents.

## Installed Orca

Inspected on Windows / PowerShell on 2026-09-14: Orca runtime **1.4.202**,
Codex CLI **0.154.0**, Claude Code **2.1.268**. Orca was already running.
[ORCA.md](ORCA.md) records the verified interface and its limitations.
Use version-matched guides again after updates; upstream examples are not
command authority.

## Intentionally absent

No custom daemon, HTTP server, REST API, FastAPI, dashboard, database (including
SQLite), Redis, MCP server, generic DAG engine, terminal/worktree manager,
process supervisor, persistent session database, agent chat bus, plugin
framework, provider SDK layer, quota/budget manager, Telegram/Slack integration,
Gemini/OpenCode support, Kubernetes, nested organizations, or recursive spawning.
No Docker, WSL, extra background service, paid demonstration run, automatic push,
or custom merge machinery is required. The Lead manages complex work; it should
not become the default implementation worker.

Reference ideas only: [Orca-first ADR](https://raw.githubusercontent.com/bygama/Agent-Engineering/main/docs/adrs/ADR-008-orchestration.md),
[structured review protocol](https://github.com/dingtianding/orchestra),
[independent verification](https://github.com/formiat/multi-agent-orchestration),
and [snapshot review receipts](https://github.com/DrSeedon/orchestra).
Their runtime architectures are not included.
