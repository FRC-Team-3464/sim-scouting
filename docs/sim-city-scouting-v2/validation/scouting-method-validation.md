# Scouting method validation

**Status:** Proposed protocol; must run before final Match Mode design

## Study design

Use recorded and practice matches representative of low, medium, and high throughput. Establish video-reviewed ground truth with two expert reviewers and adjudication. Recruit experienced and novice scouts; counterbalance method and device order. Each participant scouts the same robot using isolated prototypes. Record output accuracy, missed actions, corrections, phase errors, device-attention time, completion, workload, and qualitative feedback.

No prototype should write production data. Remove personally identifying study notes after analysis.

## Decision experiments

| Decision | Hypothesis | Method | Proposed success threshold | Keep flexible |
|---|---|---|---|---|
| Exact vs batch/volley | Batch reduces missed behavior at high throughput without unacceptable score error | Scout matched videos with both modes; compare to ground truth | Median absolute percentage error ≤15%, missed non-score events ≤10%, and ≥20% less device-attention time than exact at high throughput | Component type and action payload |
| Made/missed | Attempts improve accuracy estimates enough to justify workload | Compare made-only, attempt/outcome, and bucketed accuracy | Inter-scout ICC/weighted agreement ≥0.70 and no >10% completion decline | Attempts optional per element |
| Cycle capture | Linked pickup/score events yield reliable cycle time | Match event pairs against video | ≥80% correctly paired cycles and median timing error ≤2 s | Link IDs and derived-cycle algorithm |
| Rate intervals | Intervals approximate productivity when discrete events are infeasible | Compare interval estimates with ground truth | Error no worse than batch method and workload lower | Interval observation type |
| Quantity ranges | Honest ranges cover truth without being too broad | Score interval coverage and width | ≥85% ground-truth coverage with median width within one configured bucket | Range schema and bucket definitions |
| Zones vs coordinates | Zones improve agreement and speed; coordinates add value only in selected contexts | Alternate zone map and normalized map | Zone agreement κ ≥0.70; coordinates enabled only where median error meets strategy need | Zone set, coordinate-enabled actions |
| Timer vs manual navigation | Timer reduces phase errors | Test on-time, late-start, pause, and restart scenarios | ≥95% actions in correct phase after correction and no lost events | Audit events and phase override |
| Rating anchors | Behavioral anchors improve agreement | Compare unlabeled and anchored ratings | Weighted κ ≥0.60 and “not observed” used appropriately | Anchors/versioning |
| Phone vs tablet | Both support core workflow without material accuracy loss | Same tasks on representative devices/orientations | Completion ≥95%, mis-taps <2%, WCAG reflow pass | Responsive composition |
| Dedicated vs roaming | Reduced staffing remains usable with explicit confidence loss | Simulate six-scout, three-scout, and roaming specialist coverage | Product owner defines acceptable coverage; report missingness and confidence | Assignment types |
| Confidence capture | Session confidence is useful with less burden than per-action prompts | Compare session, exception-only, and per-action confidence | Calibration improves error prediction without >5% completion decline | Optional observation uncertainty |

Thresholds are starting recommendations and require scouting-lead approval before the study.

## Required measures

- Accuracy: count/range error, categorical agreement, spatial error, timing error
- Reliability: Cohen/Fleiss kappa, weighted kappa, ICC or range overlap as appropriate
- Workflow: completion, missed-action rate, correction count, wrong-team rate, phase error
- Attention: device glances and cumulative eyes-down time from video
- Usability: task time, SUS-style score, workload, fatigue, preference with rationale
- Accessibility: keyboard completion, screen-reader correction, 200% zoom, reduced motion, non-map alternative

## Decision rule

Select the least burdensome method meeting the strategy-use accuracy threshold. If no method passes, simplify the metric or remove it. Publish raw anonymized results, adjudication rules, device/browser versions, and the resulting season-package decision. Do not generalize one game element’s result to all elements.

## V0 constraints until completion

V0 must show configurable alternatives and must not lock batch sizes, attempts, zones, coordinate density, timer controls, ratings, staffing, or confidence prompts into a final visual system.

## Architectural interfaces that remain configurable

Until results are approved, season packages and capture contracts must preserve configuration points for:

- observation/component type and action payload schema;
- exact, batch/volley, made/missed, cycle, interval-rate, and range capture;
- batch sizes, range buckets, attempt outcomes, cycle link IDs, and interval duration;
- spatial mode per observation, zone definitions, coordinate enablement/precision, and a non-map alternative;
- phase/timer presentation, start/pause/resume/override/correction audit events, and manual navigation;
- rating anchors, scale version, and `not_observed` behavior;
- session, exception-only, or per-observation confidence;
- assignment types for dedicated, reduced, roaming, and specialist staffing; and
- responsive composition, orientation, and control density for phone and tablet.

Architecture may bound and validate these interfaces but must not select empirical defaults. The published season-package version/hash records whichever validated configuration is active.
