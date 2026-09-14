# Review brief

Supply candidate label, maker identity per SKILL.md, exact commit and baseline,
checkout, requirements, acceptance checks, maker report if present and ReviewResult
destination. Lead-authored code needs the same diff and checks as worker code.

Ask the reviewer to inspect those inputs and return verification_performed,
findings and residual_risk. Each finding has a stable ID, a blocking flag and
a supporting observation; include a file/location when relevant.
Use a null review_target for plan review. Note inaccessible inputs or checks
that could not be performed.
Record any same-family fallback in residual_risk.
