# Scouting method validation

**Status:** Proposed empirical validation protocol; architectural constraints are approved. Run the applicable validation before finalizing season-specific observation methods, staffing assumptions, and publishable package configuration.

## Registry dependency and decision ownership

The [Season Package controlled component registry](../architecture/contracts/season-package.md#controlled-component-registry) defines the only component kinds, configuration interfaces, payloads, answer-state semantics, and bounds that validation may evaluate. Validation selects among approved kinds and configurations; it does not invent schemas, executable components, or visual-contract exceptions.

The [controlled-component historical coverage review](controlled-component-registry-evidence.md) establishes why the registry includes or excludes recurring evidence primitives. CCR-001 through CCR-003 are approved and incorporated into registry schema version 1: categorized append actions, categorized spatial actions, and timer/cycle derivation from timestamped actions or state transitions. Historical recurrence establishes coverage only; it never replaces the per-observation validation below.

For each proposed season observation:

1. A Strategist identifies the concrete decision the evidence will support; fields without a strategy use are removed.
2. The Lead Scout and designer choose the least burdensome plausible registry kind and initial configuration.
3. Design produces an isolated accessible prototype using the compiled interaction semantics rather than package-provided layout or code.
4. Scouts test the candidate against ground truth on representative devices and under representative Match or Pit conditions.
5. The Lead Scout approves field usability and staffing; the Strategist approves usefulness and accuracy; engineering confirms registry compatibility and accessibility evidence. Product approval is required only when the result changes approved scope, staffing expectations, risk, or acceptable complexity.
6. Accepted and rejected candidates, evidence, limitations, and approvals are recorded in the result artifact. Only an accepted kind/configuration may later enter an immutable published season package.

If no approved kind meets the need, simplify or remove the observation. A genuinely necessary new kind follows the registry's future-extension process and cannot be introduced by a prototype or season package.

## Applicability and study planning

The decision experiments below are a catalog, not a mandatory annual checklist. Run an experiment only when a Strategist has identified a concrete decision that needs the proposed evidence or when an existing method reaches a revalidation trigger. Do not collect a field merely because its experiment appears in this protocol.

Before testing, write a bounded study plan that identifies:

- the strategy decision, candidate observation, and applicable experiment;
- the ground-truth method and adjudicators;
- participant roles and experience levels;
- the number of participants, matches or interviews, repeated observations, and expected evidence volume;
- low-, medium-, and high-throughput coverage where throughput applies;
- representative devices, form factors, input methods, and environmental conditions;
- the primary success measures and thresholds approved by the Lead Scout and Strategist before results are known; and
- the study-data access, retention, aggregation, and deletion plan.

A small-team study does not require a formal statistical-power analysis. It must still include enough repeated observations to expose training effects, disagreement, and high-workload failure. Report the sample size and limitations, and do not present an underpowered or incomplete pilot as conclusive. A short pilot may refine instructions and instrumentation; confirmation uses a fresh or counterbalanced run where practical.

## Match study design

Use recorded and practice matches representative of low, medium, and high throughput. Establish video-reviewed ground truth with two expert reviewers and adjudication. Recruit experienced and novice scouts; counterbalance method and device order. Each participant scouts the same robot using isolated prototypes. Record output accuracy, missed actions, corrections, phase errors, device-attention time, completion, workload, and qualitative feedback.

Device ergonomics testing must cover representative supported smartphones, tablets, and laptops, including touch, keyboard, portrait, and landscape conditions where applicable. It does not replace engineering's full supported browser/OS compatibility, storage, performance, and migration test matrix.

## Pit study design

Use scripted mock Pit interviews, practice interviews, or supervised event trials with known robot facts or an adjudicated reference. Test whether Scouts and interviewees understand each question, can distinguish claims from observations, select the intended structured answer and unit, and complete the workflow within the Lead Scout's operational time budget. Record completion, clarification requests, skipped or guessed answers, source/provenance accuracy, measurement/unit errors, disagreement, note use, interview duration, workload, and qualitative feedback.

Pit validation compares structured choices, measurements, claims, and bounded notes only where a strategy need exists. Claimed durations use a configured measurement and time unit, not a live timer. MVP Pit validation must work without photos and must not introduce an external-media workflow.

## Study-data handling

No prototype writes production data. Raw study evidence is access-controlled and minimized. Share aggregate anonymized results and decision rationale; do not publish participant-level raw performance by default because a small team may remain identifiable after names are removed. Delete identifying notes and participant-level study data after the bounded retention period in the study plan unless an approved follow-up requires continued restricted retention.

## Decision experiments

| Decision | Hypothesis | Method | Proposed success threshold | Keep flexible |
|---|---|---|---|---|
| Multi-delta counter | A redesigned running-total control preserves familiar rapid capture while improving error recovery, accessibility, and responsive use | Compare improved v2 compositions and season-appropriate preset sets against matched videos, ground truth, and the v1 behavioral reference | Absolute count error and event recall meet the strategy-approved observation bound, mis-taps <2%, and no material completion or device-attention regression; do not use percentage error when ground truth is zero | Preset deltas, bounds, grouping, feedback, and responsive composition; the contracted `MultiDeltaPayload` is fixed |
| Made/missed | Attempts improve accuracy estimates enough to justify workload | Compare made-only capture against one compiled `categorical_action` with made/missed options and a derived attempt rate | Event-level precision/recall, made/missed count error, derived-rate error, and nominal inter-scout agreement meet strategy-approved bounds, with no >10% completion decline | Whether attempts are captured at all, which elements justify the extra outcome choice, and the configured option set |
| Cycle capture | Pickup/score event timing yields reliable cycle estimates | Test ordered `categorical_action`, categorized spatial action, or state-transition evidence with server-derived pairing against video; do not store a raw stopwatch total | ≥80% correctly paired cycles and median timing error ≤2 s | Event definitions and derived-pairing algorithm; explicit link IDs require a contract amendment if evidence proves automatic pairing insufficient |
| Rate intervals | Bounded rate estimates may reduce workload when discrete events are infeasible | Prototype only with an approved existing kind/configuration whose evidence semantics fit the proposed checkpoint; otherwise record the need as an extension candidate | Error no worse than the discrete or range method and workload lower | Checkpoint/configuration; repeating interval semantics cannot enter a package without an approved registry amendment |
| Quantity ranges | Honest ranges cover truth without being too broad | Score interval coverage and width | ≥85% ground-truth coverage with median width within one configured bucket | Range schema and bucket definitions |
| Zones vs coordinates | Zones improve agreement and speed; coordinates add value only in selected contexts | Alternate zone map and normalized map | Zone agreement κ ≥0.70; coordinates enabled only where median error meets strategy need | Zone set, coordinate-enabled actions |
| Rating anchors | Behavioral anchors improve agreement | Compare unlabeled and anchored ratings | Weighted κ ≥0.60 and “not observed” used appropriately | Anchors/versioning |
| Representative capture devices | Supported smartphones, tablets, and laptops can complete the applicable capture workflow without material accuracy loss | Repeat the same tasks on representative touch and keyboard devices, form factors, and orientations; engineering separately runs the full compatibility matrix | Completion ≥95%, mis-taps <2%, applicable WCAG reflow/keyboard pass, and no material accuracy or attention regression | Responsive composition and control density within approved accessibility constraints |
| Dedicated vs roaming | Reduced staffing remains usable with explicit confidence loss | Simulate six-scout, three-scout, and roaming specialist coverage | Product owner defines acceptable coverage; report missingness and confidence | Assignment types |
| Pit structured interview | Structured questions produce useful attributable claims without excessive interview burden | Run the same mock or practice interview with candidate wording, structured controls, units, and bounded-note fallbacks against known facts or adjudicated reference | Critical-field completion and agreement meet strategy-approved bounds, unit/provenance errors are within the approved bound, and median interview duration fits the Lead Scout's operating plan | Question wording, component selection, choices, units, claim source, note fallback, ordering, and staffing |

Thresholds are starting recommendations and require Lead Scout and Strategist approval before the study. Product owner approval is required where a threshold changes product scope, staffing expectations, or acceptable complexity.

## Required measures

- Accuracy: count/range error, categorical agreement, spatial error, timing error
- Reliability: Cohen/Fleiss kappa, weighted kappa, ICC or range overlap as appropriate
- Workflow: completion, missed-action rate, correction count, wrong-team rate, phase error
- Attention: device glances and cumulative eyes-down time from video
- Usability: task time, SUS-style score, workload, fatigue, preference with rationale
- Accessibility: keyboard completion, screen-reader correction, 200% zoom, reduced motion, non-map alternative
- Pit interview quality where applicable: duration, clarification rate, skipped/guessed responses, source/provenance accuracy, unit errors, and structured-versus-note use

## Decision rule

Select the least burdensome method meeting the predeclared strategy-use threshold. If no method passes, simplify the metric or remove it. Record aggregate anonymized results, adjudication rules, tested device/browser versions, sample limitations, accepted and rejected candidates, and the resulting season-package decision. Keep participant-level evidence restricted under the study-data plan. Do not generalize one game element's, one Pit question's, or one device's result to unrelated observations or form factors.

## Approved MVP timing and confidence baseline

Timer interaction and confidence-prompt frequency are not open MVP experiments. The approved baseline uses one explicit Start Match action, a device-local monotonic elapsed timer, automatic package-defined phase progression, no routine pause/resume or manual phase navigation, no detailed clock-correction workflow, and no per-observation confidence prompt. Post-match review provides a simple timing/incompleteness issue flag and optional note.

Advanced timer controls, detailed correction, or granular confidence capture may be studied after MVP. They cannot replace the approved baseline without evidence and an approved ADR/contract amendment. A future live field-timing integration additionally requires a successor architecture decision covering authority, latency, offline fallback, reconciliation, provenance, and versioning.

## Approved multi-delta interaction baseline

For high-throughput numeric observations, v1 provides evidence that Scouts understand and prefer a visible running total with rapid positive and negative preset adjustments. That evidence approves the interaction concept, not the v1 visual implementation or permanent `1/5/10` presets.

V2 design validation compares improved implementations of the same concept. Candidates must preserve one-tap capture while exploring better hierarchy, grouping, last-action and local-save feedback, undo, invalid-adjustment prevention, accessibility, and narrow-screen reflow. The season package controls labels, deltas, limits, and phase applicability. A materially different capture model is tested only if the redesigned baseline fails an approved accuracy, completion, attention, accessibility, or strategy-use threshold.

## UI design constraints until completion

For every method currently under study, design exploration must show genuinely configurable alternatives and must not lock multi-delta preset sizes, attempts, zones, coordinate density, ratings, Pit question presentation, or staffing into a final visual system. An already validated method does not require perpetual alternative designs unless a revalidation trigger occurs. Timer/confidence and multi-delta interactions must follow the approved MVP baselines above. See the platform-independent [UI design constraints](../design/ui-design-constraints.md).

## Architectural interfaces that remain configurable

Until results are approved, season packages and capture contracts must preserve configuration points for:

- per-observation selection among approved component kinds and their bounded configuration; payload schemas remain contract-defined rather than package-configurable;
- multi-delta presets for high-throughput numeric observations, categorical action options for made/missed or cycle evidence where tested, and range capture;
- delta presets, range buckets, categorical/spatial action definitions, and server-derived duration, cycle, and metric rules; raw timer payloads are excluded, while explicit cycle-link or repeating-interval payloads remain extension candidates unless separately approved;
- spatial mode per observation, zone definitions, coordinate enablement/precision, and a non-map alternative;
- rating anchors, scale version, and `not_observed` behavior;
- estimate-confidence semantics where a validated observation method requires them, without per-observation confidence prompting in the MVP;
- Pit question wording, component selection, choices, units, claim-source options, structured-versus-note fallback, ordering, and interview staffing, with no MVP photo dependency;
- assignment types for dedicated, reduced, roaming, and specialist staffing; and
- responsive composition, orientation, input method, and control density for supported smartphones, tablets, and laptops.

Architecture may bound and validate these interfaces but must not select empirical defaults. The published season-package version/hash records whichever validated configuration is active.

## Required result artifact

Each validated observation records its strategy use, tested registry kind/configuration, prototype version, ground-truth source and adjudication, participant count and experience mix, match/interview count, repeated-observation and throughput coverage, device/input mix, measures, predeclared threshold, accepted and rejected results, selected configuration, known limitations, staffing assumption, accessibility result, and Lead Scout/Strategist/product approvals as applicable. The artifact links restricted evidence without exposing participant-level performance, includes the aggregate anonymized conclusion, identifies the study-data deletion date, identifies the resulting season-package content version/hash once published, and names the trigger for later revalidation.
