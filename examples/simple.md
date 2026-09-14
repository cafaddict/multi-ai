# SIMPLE: fix a documentation typo directly

This is an illustrative scenario: the misspelled sentence below is not present
in this repository's README. In a target project where it appears, the user asks:
"Fix `instalation` to `installation` in README.md."

The Lead reads [SKILL.md](../SKILL.md), [policy.yaml](../policy.yaml), and the
target repository's instructions, then inspects README.md and the current Git
status to preserve unrelated changes. This is SIMPLE: one obvious spelling
correction with no behavior change. The Lead edits directly; no workers or
reviewers are needed, and the Lead does not issue a ReviewResult.

The entire intended change is:

```diff
-See the instalation guide to get started.
+See the installation guide to get started.
```

After editing, the Lead checks the result from the target repository root:

```powershell
Get-Content -LiteralPath './README.md'
git diff -- README.md
git diff --check
```

Read the corrected sentence and inspect the diff to confirm only the requested
word changed. Check each command's outcome; `git diff --check` should produce no
output and exit 0. It checks whitespace, so it does not replace reading the diff.
No application tests or dependencies are needed for this spelling correction.

Once those observations are confirmed, give a plain completion report:

> Fixed `instalation` to `installation` in README.md. Read the corrected sentence
> and verified the diff contains only that word change; `git diff --check` exited
> 0 with no output. Nothing remains for this typo fix.
