# Dispatch brief

The Lead fills these fields as prose in Orca's task spec; this is not another
configuration format. Include only relevant role/prompt text and real values.

- **Task / role / worker identity:** goal, role, Orca Dispatch identity from the
  live preamble (use that as actor.id), configured provider and observed family.
- **Resources:** absolute paths to policy, assigned role and result schema, or
  inline contents if the worker cannot read this skill folder.
- **Target / base:** exact checkout and full baseline SHA; verify both on entry.
- **Change / constraints / ownership:** desired result, files allowed to change,
  frozen interfaces, prohibited side effects, and other owners.
- **Observable acceptance:** requirements plus commands/checks and expected
  behavior. Tests/build outputs must identify the snapshot tested.
- **Output:** WorkerResult, ReviewResult or JudgeResult as assigned; use null for
  an unknown model. Include evidence, not merely confidence or "tests passed".
- **Competition, when used:** same initial inputs, no reading sibling code,
  transcripts or reports until the Lead opens cross-review.

Workers must not create Runs, workers, provider subagents or child organizations.
Use the live preamble's exact executable, identity/capability and lifecycle IDs.
Do not reconstruct lifecycle commands from this template.

Read coordinator messages at natural checkpoints and immediately before settling.
Use the preamble's ask/resume flow for a blocking question. Observe its heartbeat
cadence. A fenced worker stops; it does not submit stale completion.

Publish the complete result JSON first, as an Orca **status** message with its
contract name as subject and JSON text as body. Use the live preamble's sender,
capability, Task and Dispatch arguments, changing type to status. Serialize JSON
as data (e.g. ConvertTo-Json -Depth 20), never shell-evaluate result text.
The Lead associates that authenticated message with this Dispatch.

Then send worker_done **once**, copying the live preamble command, with a
three-sentence executive summary and explicit outcome. End the turn and idle.
A finished review reporting CHANGES_REQUESTED has lifecycle succeeded: the
review task was completed. BLOCKED or malformed/missing output is failed.
WorkerResult ok maps to succeeded; needs_revision/blocked maps to failed.
A completed Judge assessment may recommend REVISE/BLOCK without being a failed
assessment. Lifecycle outcome and integration decision are separate facts.
