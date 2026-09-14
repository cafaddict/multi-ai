# Independent competition

Lead: name the uncertainty that two independent solutions can resolve. Freeze
requirements, interfaces, baseline SHA, acceptance tests and any benchmark method.
Use Claude and Codex selected from policy; explain if the configured families
are unavailable instead of silently presenting one solution as competition.

Give each lane the same task brief and only its own checkout. Concurrent
implementation requires distinct Orca worktrees from the same base. Verify
their paths and HEADs. For architecture or root-cause work, parallel read-only
plans may be enough; do not demand two implementations without a reason.

Do not reveal candidate code, reasoning, messages or intermediate output across
lanes until **both initial results are complete and frozen**. This is a prompt
and supervision rule, not an OS access-control claim. A failed lane must return
a bounded blocked result; record the missing comparison rather than invent it.

Then cross-review: Claude checks the Codex candidate, Codex checks the Claude
candidate, with distinct maker/checker identities. Each review targets the
other candidate's exact snapshot and the shared acceptance criteria. Record
adversarial findings, including evidence against a seemingly successful test.

Judge by reproducible evidence, not number of approvals. Choose one, request
revision, reject both, or delegate a bounded synthesis task. A synthesis has a
new snapshot and needs independent review and objective verification.
See [hard-competition.md](../examples/hard-competition.md).
