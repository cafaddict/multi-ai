# NORMAL: input validation

User: "Add input validation to this API and add regression tests."

Project guidance brings the Lead to [SKILL.md](../SKILL.md). The Lead identifies
accepted/rejected inputs and compatibility requirements. This example uses an
Engineer because implementation is a useful bounded assignment;
[dispatch.md](../prompts/dispatch.md) supplies its brief and report contract.

The Lead resolves roles.engineer from policy.yaml and passes all three native
launch options. After the Engineer commits, the Lead requests review of that SHA
using [review.md](../prompts/review.md) and the actual maker's family route.
If only the maker's family is available, the configured same-family fallback runs
in a fresh independent checker session and records the limitation.

The Lead examines the diff, reproduces meaningful acceptance checks, resolves
blocking findings and records its judge decision before authorized integration.
A revision produces a new commit and requires fresh approval.

For a small localized implementation, the Lead might write the change itself.
The behavior change still gets an independent Reviewer; its maker_id is the Lead's
Orca coordinator handle. The user need not request these orchestration steps.
