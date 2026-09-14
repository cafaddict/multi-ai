# Multi-AI

A small intelligence policy on top of Orca: **Policy -> Orca**.
Orca owns processes, terminals, worktrees, tasks, messaging and persistence.
This repository supplies instructions and result contracts, with no runtime code
or installation dependencies.

The Lead decomposes, dispatches, verifies, judges and integrates.
The five roles are [Lead](roles/lead.md),
[Architect](roles/architect.md), [Engineer](roles/engineer.md),
[Researcher](roles/researcher.md) and [Reviewer](roles/reviewer.md); the Lead's
judge phase is not another worker. The authoritative rules and routing levels
are in [SKILL.md](SKILL.md).

[SIMPLE](examples/simple.md) demonstrates direct work;
[NORMAL](examples/normal.md) demonstrates implementation and independent review;
[HARD](examples/hard-competition.md) demonstrates isolated competitors.
CRITICAL adds investigation only when a specific risk justifies it.

## Use and configuration

Open a Lead session in Orca and ask it to read this SKILL.md, using an absolute
path when working in another repository. No global skill installation is needed.
Use the Lead route in [policy.yaml](policy.yaml) when launching; an existing
session does not change models merely by reading the file.

policy.yaml centralizes explicit agent/model/effort choices, role-specific
fallbacks and opposite-family reviewer routes. The Lead passes those choices
directly to native worker-start. It is human/agent guidance, not an Orca config
file or a provider adapter. Configure agent execution permissions in Orca.

Inspected with Orca **1.4.202**, Codex **0.154.0**, Claude Code **2.1.268** on
Windows / PowerShell. Codex IDs/efforts were checked in its local model cache;
Claude IDs in Orca's bundled catalog and Claude's interface. Account availability
was not tested with paid calls. The conservative Claude pins use locally
recognized versions, with explicit fallbacks. Model context:
[OpenAI](https://developers.openai.com/api/docs/models),
[Claude](https://code.claude.com/docs/en/model-config).

## Contracts and checks

Each worker writes a small JSON report referenced by native worker_done
--report-path. The Lead reads that file and independently verifies its claims.
Schemas describe structure, not a sandbox or an automatically enforced merge gate.

For a lightweight local check, parse each schema with PowerShell
`Get-Content -Raw <schema-path> | ConvertFrom-Json` and use PowerShell 7
`Test-Json -SchemaFile <schema-path>` against a report. Inspect the diff, local
links and examples, and compare commands with the installed Orca help.
No worker launch is needed to validate documentation.

## Intentional limits

No daemon, HTTP/REST server, FastAPI, dashboard, database/SQLite, Redis, MCP server,
generic DAG engine, terminal/worktree manager, process supervisor, persistent
session database, chat bus, plugin framework, provider SDK layer, quota/budget
manager, Telegram/Slack integration, Gemini/OpenCode, Kubernetes or recursive
agent organizations. No Docker, WSL, extra service or custom merge machinery.
