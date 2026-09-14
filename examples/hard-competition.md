# HARD: intermittent CUDA regression

User: "The CUDA path is intermittently 30% slower. Find the root cause and fix it."

The Lead consults [SKILL.md](../SKILL.md) and establishes a reproducible workload,
baseline commit, device/environment, warmup and repeated timing method on the
workspace host. One slow sample does not establish a regression or its cause.

Independent hypotheses could distinguish synchronization from allocation behavior.
The Lead may dispatch two Researcher lanes using the configured competition routes
and [competition.md](../prompts/competition.md). Both get the same observations;
neither sees the other's initial conclusions. Benchmarks on a shared GPU run
sequentially so competing workloads do not contaminate the measurements.

Once both initial results exist, the Lead can ask them to challenge each other's
hypotheses. Reproducible measurements decide which explanation survives. If one
investigation settles the uncertainty, duplicate implementations are unnecessary.
Unavailable cross-family coverage is recorded rather than silently claimed.

An Engineer implements the supported fix. If two implementations remain useful,
Orca supplies separate worktrees at the same base. The selected code receives
independent review of its exact SHA and equivalent benchmark checks. The Lead
judges correctness, performance and review findings before integration; a new
combined implementation is a new review target. No special user prompt is required.
