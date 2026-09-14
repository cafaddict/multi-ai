# Validation without paid workers

Development checks must not launch Claude/Codex workers. Help and read-only
runtime queries are sufficient to validate the documented CLI surface.
These checks do not establish authentication, model availability, prompt delivery,
or real worker completion; the first real task exercises those separately.

## Read-only preflight

Run from the repository in PowerShell:

```powershell
orca status --json
orca skills get orchestration
orca orchestration worker-start --help
orca orchestration check --help
orca orchestration send --help
orca orchestration worker-release --help
git status --short
```

Expected: ready runtime; native start/check/send/release commands; no additional
Run, Task, Dispatch or worker created. Do not assume low-level
`dispatch --dry-run` proves that the complete worker workflow ran.

## Schemas, YAML and local references

The three schemas use JSON Schema draft 2020-12. Review/Judge schemas reuse
actor, command and snapshot definitions in worker-result.schema.json, so keep
the three files together. There is no runtime validator bundled here.

Optional contributor validation uses Python with jsonschema and PyYAML in a
temporary environment; neither is required to use the skill:

```powershell
$validationEnv = Join-Path ([IO.Path]::GetTempPath()) ('multi-ai-check-' + [Guid]::NewGuid().ToString('N'))
Write-Output $validationEnv
python -m venv $validationEnv
if ($LASTEXITCODE -ne 0) { throw 'Cannot create validation environment' }
$validationPython = Join-Path $validationEnv 'Scripts/python.exe'
& $validationPython -m pip install jsonschema PyYAML
if ($LASTEXITCODE -ne 0) { throw 'Cannot install validation-only dependencies' }
@'
import json, re
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

root = Path.cwd()
paths = sorted((root / "schemas").glob("*.schema.json"))
schemas = {p.resolve().as_uri(): json.loads(p.read_text()) for p in paths}
registry = Registry().with_resources(
    (uri, Resource.from_contents(s)) for uri, s in schemas.items()
)
for uri, schema in schemas.items():
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator({"$ref": uri}, registry=registry)
    assert not validator.is_valid({}), uri
    def refs(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "$ref":
                    registry.resolver(uri).lookup(child)
                else:
                    refs(child)
        elif isinstance(value, list):
            for child in value:
                refs(child)
    refs(schema)
policy = yaml.safe_load((root / "policy.yaml").read_text())
assert policy["lead"]["provider"] in policy["providers"]
assert policy["limits"]["worker_depth"] == 1
skill = (root / "SKILL.md").read_text()
front = yaml.safe_load(skill.split("---", 2)[1])
assert front["name"] == "multi-ai" and front["description"]
for path in root.rglob("*.md"):
    for link in re.findall(r"\[[^\]]+\]\(([^)]+)\)", path.read_text()):
        if "://" not in link and not link.startswith("#"):
            assert (path.parent / link.split("#")[0]).exists(), (path, link)
print("Schemas, references, YAML and Markdown links passed")
'@ | & $validationPython -
if ($LASTEXITCODE -ne 0) { throw 'Validation failed' }
```

The temporary environment can be removed later using its exact printed/resolved
path. Do not recursively remove a computed parent directory.

## PowerShell examples

Parse every fenced PowerShell example without executing it:

```powershell
$parseFailures = @()
foreach ($file in Get-ChildItem -Recurse -Filter '*.md') {
    $content = Get-Content -Raw -LiteralPath $file.FullName
    foreach ($block in [regex]::Matches($content, '(?ms)^```powershell\r?\n(.*?)^```')) {
        $tokens = $null
        $parseErrors = $null
        [void][System.Management.Automation.Language.Parser]::ParseInput($block.Groups[1].Value, [ref]$tokens, [ref]$parseErrors)
        $parseFailures += $parseErrors
    }
}
if ($parseFailures.Count) { throw ($parseFailures | Out-String) }
'PowerShell examples parsed'
```

Compare the commands and flags in those parsed blocks with
`orca agent-context --json` and command-specific help; do not execute mutations
just to check syntax. Context variables in examples must be filled from actual
receipts before a real run.

## Manual policy cases

| Case | Required behavior |
| --- | --- |
| Tiny typo | SIMPLE, direct edit, no worker |
| NORMAL implementation | Separate maker/checker identities, cross-family review, Lead independently verifies |
| Two competing implementations | Distinct worktrees, same base; no reveal before both initial results settle |
| Worker says tests pass without output | Inspect/rerun; missing required evidence prevents approval |
| Review APPROVED with a blocking finding | Schema rejection |
| Short SHA, missing target or unknown verdict | Schema rejection |
| Self-review with structurally valid JSON | Lead rejects from identity/provenance; schema alone cannot detect it |
| Approval at commit A, current HEAD B | Stale approval; review B before integrating |
| Plan SELECT | Allowed with an immutable artifact hash; not Git integration |
| INTEGRATE with null target or unresolved blocker disposition | Schema rejection |
| Selected ID absent from candidates, omitted blocker, or fabricated evidence | Lead rejects semantically even if schema-valid |
| Cross-family reviewer unavailable | Block by default; configured same-family exception must be disclosed |
| Review completed with CHANGES_REQUESTED | Orca lifecycle succeeded; integration remains blocked |
| Empty mailbox / ambiguous start | Inspect/wait/recover natively; no duplicate editor |
| Worker asks to spawn | Report to Lead for a sibling task; no grandchildren |
| Conflict resolution after review | New commit, new independent review and objective checks |

## First real run

Use the exact command in [README.md](../README.md). It authorizes a local V1
baseline commit, then a small NORMAL task with two paid worker turns plus the
Lead's work. Additional fix/review rounds run only if needed.

Observe native Task/Dispatch identities, structured status messages, accepted
worker_done, complete Delivery acknowledgment and worker-release receipts.
Ensure the review and Judge target the actual final commit; inspect files and
record independent checks. Confirm no reclaimable worker resource remains.
No push or public publishing is part of this smoke test.
