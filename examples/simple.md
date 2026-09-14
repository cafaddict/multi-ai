# SIMPLE: documentation typo

A user asks to change "instalation" to "installation" in a README sentence.
After applying [SKILL.md](../SKILL.md), the Lead classifies the one-word correction
as SIMPLE and makes it directly.

```powershell
Get-Content -LiteralPath './README.md'
git diff -- README.md
git diff --check
```

The Lead reads the resulting sentence and confirms that only the requested word
changed. A clean whitespace check alone would not establish that.
