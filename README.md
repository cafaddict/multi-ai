# Multi-AI

**Orca is the mechanism. Multi-AI is the policy.** Install once on the host
where your Orca agents run, then give Codex or Claude Code the task: "Fix this bug"
or "Investigate this performance regression and fix it." No orchestration prompt or worker
commands are needed from the user.

[SKILL.md](SKILL.md) owns shared rules; [policy.yaml](policy.yaml) owns model routes.
Roles, prompts and schemas supply details only when needed. Orca owns processes,
terminals, worktrees, tasks, messages and persistence. There is no orchestration runtime.

## How it works

```mermaid
flowchart TD
    Human["Engineering task"] --> Lead["Lead: assess scope and uncertainty"]
    Lead -->|"Tiny or mechanical"| Direct["Direct edit and checks"]
    Direct --> Report["Report to human"]
    Lead -->|"Localized implementation"| Local["Lead implements"]
    Lead -->|"Useful delegation"| Engineer["Engineer implements"]
    Lead -->|"Design questions"| Architect["Architect"]
    Lead -->|"Evidence needed"| Researcher["Researcher"]
    Architect --> Lead
    Researcher --> Lead
    Lead -->|"Independent hypotheses useful"| Competition["Separate solution lanes"]
    Competition --> Compare["Initial results complete; critique and compare"]
    Compare --> Lead
    Local --> Review["Independent code review; prefer opposite family"]
    Engineer --> Review
    Review --> Judge["Lead: verify evidence and judge"]
    Judge -->|"Exact SHA reviewed; blockers resolved"| Integrate["Lead integrates"]
    Judge -->|"Revision needed"| Lead
    Integrate --> Report
```

Paths are choices, not worker counts. The Lead creates every Orca worker.
Architect covers structure and tradeoffs; Researcher gathers evidence and hypotheses.
SKILL.md defines review and integration requirements, including Lead-authored code.

## Install once per host

Clone this private repository using your GitHub credentials:

```sh
git clone --branch dev https://github.com/hyunyul-XCENA/multi-ai.git
cd multi-ai
```

On Windows / PowerShell:

```powershell
./install.ps1
```

On Linux/macOS or an SSH host:

```sh
sh ./install.sh
```

Both scripts call the existing [skills CLI](https://github.com/vercel-labs/skills)
with `--global`, `--skill multi-ai` and `--agent codex claude-code`. The CLI manages
installation; the scripts contain no skill-copy or worker-launch implementation.
Node/npx and GitHub access are needed for installation, not for running the skill.
A failed CLI install stops the script. Re-running refreshes the global installation.

Codex discovers `~/.agents/skills/multi-ai/`; Claude uses `~/.claude/skills/multi-ai/`.
This covers all projects for that user on that host. Run once on Windows for local
projects and once on each remote execution host; Windows installation is not remote
installation. No project-by-project installation or recurring prompt is needed.

For an intentionally project-scoped copy, use the CLI directly from the target root:

```sh
npx --yes skills add https://github.com/hyunyul-XCENA/multi-ai/tree/dev --skill multi-ai --agent codex claude-code --yes
```

That creates `.agents/skills/multi-ai/`, the Claude entry and skills-lock.json.
Commit those files if the project should distribute the skill. Prefer one scope to
avoid duplicate discovery or personal Claude skill precedence. To switch an existing
project copy to global, remove the project copy with `npx skills remove multi-ai --yes`
from that project, then run the global installer.

Without Node, copy SKILL.md, policy.yaml, roles/, prompts/ and schemas/ into both
user skill directories. Maintain both copies together; no script is needed to use them.

## Activate for ordinary requests

For consistent automatic use, add this once to Codex's **CODEX_HOME/AGENTS.md**
(default `~/.codex/AGENTS.md`) and Claude's **~/.claude/CLAUDE.md**, preserving other
instructions. These are user-level files on the execution host:

```markdown
For non-trivial engineering work, consult the installed multi-ai skill and choose
the smallest useful workflow. Handle tiny edits directly. An active Orca worker
Dispatch retains its assigned role and scope; it must not start a team.
```

For project-specific activation instead, use the project's AGENTS.md and import it
with `@AGENTS.md` from its CLAUDE.md.
[Codex](https://learn.chatgpt.com/docs/build-skills) discovers `.agents/skills`;
[Claude](https://code.claude.com/docs/en/skills) uses `.claude/skills` and
[CLAUDE.md imports](https://code.claude.com/docs/en/memory#agentsmd). Both can select
skills from their descriptions; the short routing instruction makes intended use explicit.
Discovery is not a deterministic enforcement gate.

Start your usual Codex or Claude session in the target Orca workspace and give
only the task. Saved Lead prompts can be shortened. Set Lead model/effort when
launching; a skill cannot change an existing session's model or permissions.
Explicit `$multi-ai` (Codex) or `/multi-ai` (Claude) remains available.

Verify the global path in Codex `/skills` or Claude's skill list, or run
`npx skills list --global --agent codex claude-code`. Restart after adding instructions.
Check behavior during real work; no paid demo is needed:

| Task alone | Expected decision |
| --- | --- |
| "Fix this typo in README." | [SIMPLE](examples/simple.md): direct edit and checks. |
| "Add input validation to this API and regression tests." | [NORMAL](examples/normal.md): delegate if useful; independently review the behavior change. |
| "The CUDA path is intermittently 30% slower. Find the cause and fix it." | [HARD](examples/hard-competition.md): consider independent hypotheses, benchmark, then implement and review. |

## Orca setup

Install and activate the skill above before saving the launcher. Orca needs no
special "Lead" role setting; the user-facing session follows the installed policy.

In Orca's Codex agent settings, set **default arguments** to `--approve-for-me`.
Replace any previous `--dangerously-bypass-approvals-and-sandbox` argument.
Automatic approval review uses Codex's workspace-write sandbox; it can still reject
an action. Keep model/effort choices out of these shared defaults: the Lead launcher
and each worker's native dispatch select them explicitly.

In **Quick Commands**, add and save:

| Field | Value |
| --- | --- |
| Name | `Multi-AI lead` |
| Action | **Terminal Command** (shown as **Terminal**) |
| Scope, under Advanced | **Global** |
| Append Enter | **On** |

Use this command, matching the current `lead.primary` in policy.yaml:

```sh
codex --approve-for-me --model gpt-6-astra -c model_reasoning_effort=xhigh
```

A Terminal Command supplies its own launch arguments, so include the permission
option here too. Update this saved command if you change the Lead model or effort
in policy.yaml. After installing the [optional recovery profile](#optional-codex-recovery-reminder)
on the same execution host and Codex configuration home, add `--profile multi-ai`
to the command and trust the hook once through `/hooks`. No initial orchestration
prompt is needed after activation.

For a new task, create a worktree under the intended Orca project, or open the
checkout you intend to use. Open a **Blank Terminal**, right-click **inside that
terminal**, and choose **Quick Commands → Multi-AI lead**. Codex starts in that
terminal; enter only your engineering task. Running the command from the **tab-bar
Quick Commands button** creates another tab, leaving the blank terminal open.

Global commands saved in this Orca client are available in its local and remote
workspace menus; you do not need a separate command for each SSH project. They run
in the selected workspace's terminal. The skill, Codex/Claude installation, login
and optional recovery profile must exist on that execution host. If a command is
missing, check its Global scope and which Orca client/profile saved it; Global does
not synchronize settings to a different Orca installation.

## Update and remove

In the source clone, run `git pull --ff-only`, then re-run `./install.ps1` or
`sh ./install.sh`. The scripts refresh the published global skill through the CLI.
Review any custom edits in the installed policy before updating.

To remove the global installation:

```sh
npx --yes skills remove multi-ai --global --yes
```

Remove the Multi-AI routing paragraph from your user instructions and any saved
invocation/profile option; preserve unrelated content. Remove only the generated
multi-ai.config.toml if you installed the optional profile. For project-scoped
installations use `npx skills update multi-ai --project --yes` or remove without
`--global`. Local-source CLI installations update by repeating their add command;
skills 1.5.26 skips them in update. Manual-copy installations maintain both copies.

## Routing and remote work

Model preferences remain in policy.yaml. Every worker receives explicit native
`--agent`, `--model` and `--effort` options. Review prefers the opposite maker family;
if those routes are unavailable, same_family_fallback permits a fresh independent
checker with the limitation recorded. Remove that fallback or require cross-family
coverage in the task to make it mandatory. Model availability is account-specific.

NORMAL/HARD guide judgment; CRITICAL deepens verification rather than maximizing
agents. For SSH projects, installation, builds, tests and benchmarks run on the
workspace's execution host. Paths and reports are not automatically shared across
hosts. Use Orca's installed placement guide for remote dispatch.

Checked against Orca 1.4.202, Codex 0.154.0 and skills CLI 1.5.26. Native guides remain
authoritative as tools change. No host scheduler or provider adapter is added.

## Optional Codex recovery reminder

The default installer does not change Codex configuration. To also create the
recovery profile, use `./install.ps1 -RecoveryProfile` or
`sh ./install.sh --recovery-profile`. Both still perform the global skill install.
The profile is written under CODEX_HOME (default ~/.codex) and references the global
skill's [recover.md](prompts/recover.md), so it can be used across projects on this host.
Models, permissions and base configuration are unchanged.

Add `--profile multi-ai` to your Codex launcher. Review/trust the native hook in
`/hooks`, then start a new session. It injects a short reminder at startup/resume/compact
with a 400 approximate-token limit; policy re-reads still consume context. See native
[hooks](https://learn.chatgpt.com/docs/hooks) and
[profiles](https://learn.chatgpt.com/docs/config-file/config-advanced#profiles).

The hook does not automatically propagate to workers or Claude. Profile creation
accepts only identical existing content. To replace an older generated profile,
disable its launcher option, inspect and remove only that profile, regenerate and
trust its new definition. Ordinary installation does not touch an existing profile.

## Contracts and limits

Workers write JSON reports referenced by native worker_done --report-path. Schemas
describe structure; the Lead verifies identity, snapshots and evidence. Use available
JSON tooling and native CLI help for structural checks; these cannot prove behavior.

No daemon, HTTP/REST server, FastAPI, dashboard, database/SQLite, Redis, MCP server,
generic DAG engine, terminal/worktree manager, process supervisor, session database,
chat bus, plugin framework, provider SDK, quota/budget manager, Telegram/Slack,
Gemini/OpenCode, Kubernetes or recursive teams. No Docker, WSL or extra service.
