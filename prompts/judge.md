# Judgment request

Evaluate candidate IDs/snapshots against requirements and independent reviews.
Inspect actual source and objective evidence. Verify the author/reviewer
identities from Orca dispatch provenance, not merely JSON fields. Validate
contract shape; match each review to its candidate's exact target and base.

Use requirements, observed code, tests, benchmarks, reproducible evidence, review
findings, simplicity, then confidence. Make a reasoned choice; do not vote.
List rejected alternatives and why, residual risks, and required follow-up.

For every blocking finding applicable to the selected snapshot, record its
qualified ID (reviewer/finding), a disposition and evidence. Findings confined
to rejected candidates belong in rejected_alternatives with their IDs and
evidence that they do not apply to the selection; do not label them false.
Fixed findings require a new review of the changed
snapshot. Rejected findings need reproducible counter-evidence. Any unresolved
finding prevents INTEGRATE. A CHANGES_REQUESTED review whose every blocker is
evidence-rejected may support integration; record the disagreement, never
rewrite that review as APPROVED. A BLOCKED/incomplete review cannot.

Emit JudgeResult: SELECT for a plan or provisional candidate, INTEGRATE only
after review and independent objective checks of the final Git snapshot,
REVISE, BLOCK, or REJECT otherwise. Candidate selection and target equality,
complete finding coverage, maker != checker and evidence truth are semantic
checks performed by the Lead; JSON Schema cannot establish them.

Record the result in the Run's native status messages. Integration is a separate
authorized action; verify the actual resulting HEAD and do not claim success
from this recommendation alone.
