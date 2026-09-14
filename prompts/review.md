# Review brief

Supply candidate label, maker Dispatch ID, exact commit and baseline, checkout,
requirements, acceptance checks, WorkerResult path and ReviewResult destination.

Ask the reviewer to inspect those inputs and return verification_performed,
findings and residual_risk. Each finding has a stable ID, a blocking flag and
a supporting observation; include a file/location when relevant.
Use a null review_target for plan review. Note inaccessible inputs or checks
that could not be performed.
