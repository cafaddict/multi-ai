# Independent review request

Lead supplies: candidate ID; maker's authenticated identity, provider/family;
exact review_target (full commit plus base, or immutable artifact SHA-256);
checkout/artifact path; requirements; acceptance commands; WorkerResult; and
relevant raw evidence. Include the ReviewResult schema and Reviewer role.

Reviewer: establish that you are not the maker. Verify the target independently.
For Git, inspect HEAD, clean status, baseline ancestry, the full base-to-target
diff, surrounding code and tests. A branch name, timestamp or patch summary is
not a snapshot. For a plan, recompute the artifact hash and read those bytes.

Exercise the relevant acceptance behavior. Inspect actual command/output/exit
status, and state what you ran yourself versus only inspected. Missing evidence,
inaccessible source or mismatched snapshots yields BLOCKED, never guessed
approval. Cite precise blocking and non-blocking findings; no code edits.

Return ReviewResult tied to that target. An APPROVED result with a blocker is
invalid. A changed target needs another review even if the previous findings
were fixed. The Lead will check identity and target equality; schema validity
alone is not approval.
