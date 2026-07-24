# Controlled component registry evidence

**Status:** Approved evidence basis; CCR-001, CCR-002, and CCR-003 approved by the product owner and principal architect on 2026-07-24

## Purpose

This document records the evidence used to test and approve the [Controlled Component Registry](../architecture/contracts/season-package.md#controlled-component-registry) against recurring FRC Match and Pit Scouting evidence. It is an evidence and gap-analysis artifact, not a second schema authority. The Season Package contract remains normative.

The goal is a comprehensive set of safe, reusable evidence primitives. It is not a permanent component for every game-specific field, a copy of another team's form builder, or a guarantee that every historically collected field was useful. Season observations still require the [scouting-method validation protocol](scouting-method-validation.md).

## Research questions

1. Which observation shapes recur across materially different FRC games?
2. Which public scouting systems independently converge on the same input behaviors?
3. Can the candidate registry represent each shape without ambiguous payloads or excessive Scout effort?
4. Which apparent widgets should instead be compiled presentation over timestamped actions, state transitions, context, or derived metrics?
5. Which gaps justify a registry amendment before schema version 1 is frozen?

## Source hierarchy and limits

| Priority | Source | What it establishes | What it cannot establish |
|---:|---|---|---|
| 1 | [FIRST archived game documentation](https://www.firstinspires.org/resources/library/frc/archived-games) | Official game phases, scoring actions, states, field elements, and endgame concepts | What individual teams actually scouted or which UI was usable |
| 2 | [TBA Developer APIs and archives](https://www.thebluealliance.com/apidocs) | Event identity, schedules, official results, statistics, and year-specific alliance score breakdowns | Raw per-robot Scout observations, Scout interaction cost, or ground-truth attribution of most alliance totals to one robot |
| 3 | Public team collection schemas and configurations | Real per-robot Match/Pit fields, widget taxonomies, timelines, and offline workflows | Whether every field was accurate, useful, accessible, or appropriate for this team |
| 4 | [FIRST scouting guidance](https://www.firstinspires.org/resources/library/frc/technical-resources) and team whitepapers | Strategy-first field selection, qualitative evidence, staffing, comparison, and training practices | A universal payload contract or automatic validation success |

TBA is valuable as an official-results and alliance-breakdown corpus, not as a raw scouting corpus. Its historical data may check whether season packages cover official scoring concepts and may support aggregate validation, but it must not be treated as per-robot truth where the source reports an alliance total.

This review uses public interfaces and behavioral taxonomies only. It does not copy source code, visual designs, or season configurations into the application. Any later code reuse requires a separate license review. TBA attribution and branding requirements apply to production TBA integration independently of this study.

## Reproducible public-software sample

Repositories were inspected at the following commits on 2026-07-24:

| Project | Evidence inspected | Commit | License observed |
|---|---|---|---|
| [ScoutingPASS](https://github.com/PWNAGERobotics/ScoutingPASS) | Configuration guide; 2020 and 2022–2026 Match configurations; 2023–2026 Pit configurations | `e362d4ce3c9e2d232a0c74ffd8be7a42659fbb4a` | GPL-3.0 |
| [Citrus Circuits 2024 schema](https://github.com/frc1678/schema-2024-public) | Objective Match timeline, subjective Match fields, Pit schema, derived auto paths, and collection boundaries | `aa1496022d14a861c7f219139e530a907478150c` | MIT |
| [Black Hawks Scouting](https://github.com/FRC2834/blackhawks-scouting) | Widget catalog and 2022–2025 Match/Pit configurations | `724f2e37bbad7aa94168614ff6c7bb615a2bcfc8` | MIT |
| [FRC Krawler](https://github.com/frc2052/FRC-Krawler) | Metric-type documentation and typed metric model | `390326653f2c6fed22b35fd85f63e9eb2071c565` | MIT |

The sample is intentionally diverse: browser/QR, Android/timeline, configurable PWA, and Bluetooth-oriented scouting systems. Frequency in this sample is supporting evidence, not a popularity measurement.

## Evidence-model rules used for normalization

Historical fields are mapped by evidence semantics rather than widget appearance:

- An **append action** records that something happened and preserves its sequence and elapsed-time/phase attribution.
- A **state transition** records entry into or exit from a state; duration is derived from transition times.
- A **replaceable response** records the current draft answer to one question; accepted corrections create a record revision.
- **Context** such as event, match, team, station, assignment, Scout, and package hash belongs to the record envelope and is not a configurable component.
- A **derived metric** such as cycle duration, accuracy, link count, route, or average is computed from accepted evidence and does not become raw input merely because another application displayed a dedicated widget.
- Headings, spacers, pictures, colors, grids, and responsive placement are compiled presentation and are not evidence types.

These distinctions prevent a remote form builder from entering the architecture and keep one stored meaning independent of a particular visual control.

## Historical season coverage

The official-season column summarizes representative raw evidence shapes rather than every scoring rule. Public configuration evidence is named where it was directly inspected.

| Season | Representative evidence shapes | Candidate registry mapping | Coverage finding |
|---|---|---|---|
| 2015 — Recycle Rush | Piece/container/litter counts, stack height/composition, zone placement, cooperation state | `multi_delta_counter`, `range_selector`, `zone_action`, `state_machine`, `segmented_choice` | Covered; stack composition may use bounded choices or ordered actions rather than a game-specific stack widget |
| 2016 — Stronghold | High/low goals, defense crossing, failed/successful traversal, challenge/scale, defense capabilities | `action_button`, `multi_delta_counter`, `state_machine`, `checklist`, `segmented_choice` | Covered compositionally; repeated success/failure action categories expose the categorical-action gap |
| 2017 — Steamworks | High-volume fuel, gear delivery, rotor contribution, climb state | `multi_delta_counter`, `action_button`, `state_machine`, `binary_choice` | Covered; fuel volume validates configurable deltas rather than a fixed `+1` counter |
| 2018 — Power Up | Cube destination, vault actions, scale/switch interaction, climb/assist state | `action_button`, `zone_action`, `state_machine`, `checklist` | Covered compositionally; action destination/category is awkward when one spatial surface must record several meanings |
| 2019 — Deep Space | Cargo/hatch outcome by ship/rocket level, starting level, HAB end state | `zone_action`, `action_button`, `state_machine`, `segmented_choice` | Covered compositionally; spatial action category is a repeated gap |
| 2020 — Infinite Recharge | Port counts, start/shooting positions, control-panel pass/fail, climb/balance/park, ratings, failures, notes | All current numeric, spatial, choice, state, rating, binary, and note primitives | Direct ScoutingPASS configuration coverage; no unique new kind |
| 2021 — At Home | Skills/challenge workflows rather than a normal multi-team event corpus | Not used to justify MVP field components | Excluded from recurrence counts because it is not comparable to a standard event workflow |
| 2022 — Rapid React | Taxi, high/low scored and missed counts, intake source, shooting position, climb level/failure, ratings | `binary_choice`, `multi_delta_counter`, `segmented_choice`, `zone_action`, `state_machine`, `anchored_rating` | Direct ScoutingPASS/Black Hawks coverage; scored/missed pairs strengthen the categorical-action case |
| 2023 — Charged Up | Start/grid positions, cone/cube level, attempts, pickup source, docking duration/state, failures, ratings | `zone_action`, `coordinate_action`, `multi_delta_counter`, `segmented_choice`, `state_machine`, `anchored_rating` | Direct public configuration coverage; grid category and timer behavior require the resolutions below |
| 2024 — Crescendo | Speaker/amp/trap/ferry/fail/drop actions, intake zones, incapacity interval, phase transitions, climb state, defense/quickness ratings | `action_button`, spatial actions, `state_machine`, `anchored_rating` | Citrus timeline confirms append-category actions and timestamp-derived intervals; strongest evidence for one registry amendment |
| 2025 — Reefscape | Coral level, algae destination, pickup source, starting/scoring position, cage/end state, failures, Pit mechanisms and dimensions | `multi_delta_counter`, spatial actions, `segmented_choice`, `state_machine`, `measurement`, `checklist`, `note` | Direct ScoutingPASS/Black Hawks coverage; no additional unique kind beyond categorical/spatial action refinements |

The 2015–2019 rows use official game semantics to test archetype coverage. The 2020 and 2022–2025 rows additionally have directly inspected public collection configurations. This difference must remain visible; absence of a public configuration is not evidence that teams did not collect a field.

## Independent widget-taxonomy comparison

| External behavior | Systems observed | Registry interpretation | Disposition |
|---|---|---|---|
| Text / textarea | ScoutingPASS, Black Hawks, FRC Krawler | `note` with domain length limits | Keep; never use text where a bounded type is available |
| Number | ScoutingPASS, Black Hawks | `measurement`, `multi_delta_counter`, or derived/context value according to meaning | Keep semantic types; do not add an untyped number field |
| Counter / spinbox | All three configurable systems | `multi_delta_counter` for rapid repeated evidence | Keep configurable positive/negative deltas and append history |
| Slider | FRC Krawler | `range_selector` for buckets or `anchored_rating` for qualitative judgment | Do not add a generic continuous slider; it encourages false precision and has accessibility/input risks |
| Boolean / checkbox | All three configurable systems | `binary_choice` with no preselected false value | Keep explicit unanswered/true/false semantics rather than importing default-off behavior |
| Radio / dropdown / chooser | All three configurable systems | `segmented_choice` with renderer selected by option count and device | Keep one payload kind; visual dropdown versus segments is compiled UI behavior |
| Multi-checkbox | Black Hawks, FRC Krawler | `checklist` with bounded selection rules | Keep |
| Stopwatch / timer / laps | All three configurable systems | `state_machine` or action timestamps with derived duration/cycles | Do not add an MVP raw timer kind; see timing resolution |
| Clickable image / positions | ScoutingPASS, Black Hawks | `zone_action` or `coordinate_action` with a required non-map alternative | Keep; never store image pixels as the evidence meaning |
| Toggle grid | Black Hawks | Bounded field zones plus action category/state; compiled grid is presentation | Do not add a generic grid payload; spatial action categories need refinement |
| Heading / label / picture / spacer | Black Hawks, FRC Krawler | Compiled UI content and grouping | Exclude from registry payload kinds |

## Citrus timeline findings

The inspected 2024 objective schema stores an ordered timeline of `(time, action_type)` evidence. Its action vocabulary includes scoring, intake by location, amplification, drop, ferry, fail, phase transitions, trap, and incapacity start/end. Separate fields record start position, stage outcomes, and parking. The subjective schema records quickness/awareness ranks and climb timing context. The Pit schema uses bounded enums, booleans, and numbers.

This supports four architectural conclusions:

1. Action category is part of raw evidence and should not be inferred from a button's label.
2. Start/end state transitions plus elapsed timestamps are sufficient to derive incapacity and activity duration.
3. Ordered zone/action evidence can derive an autonomous path without a raw route string.
4. Objective Match, subjective Match, Pit, and derived collections have different semantics even when they reuse the same compiled controls.

## Match evidence-archetype coverage

| Evidence archetype | Example | Current representation | Fit |
|---|---|---|---|
| One occurrence | Leave, foul observed, feed | `action_button` | Exact |
| Rapid homogeneous count | Fuel, cargo, notes, coral | `multi_delta_counter` | Exact |
| Append action with one of several outcomes | Made/missed, score/fail/drop/ferry | `categorical_action` | Exact under approved CCR-001 |
| Exact bounded quantity | Alliance robots climbed, pieces remaining | `measurement` or reviewed counter | Exact when the strategy requires exact value |
| Honest quantity bucket | `0–5`, `6–10`, `11–15` | `range_selector` | Exact |
| Explicit yes/no | Mobility, tipped, defended | `binary_choice` | Exact |
| One categorical answer | Intake source, end state | `segmented_choice` | Exact |
| Multiple capabilities/observations | Mechanisms used, observed failure types | `checklist` | Exact |
| State and duration | Disabled, defending, climbing, docked | `state_machine`; duration derived from timestamped transitions | Exact without a separate timer payload |
| Discrete field location | Start zone, scoring node, intake zone | `zone_action` | Exact for one action meaning |
| Continuous field location | Approximate shot coordinate | `coordinate_action` | Exact where validation justifies precision |
| Location plus action/outcome category | Cone/cube node, made/missed location | `zone_action` or `coordinate_action` with `actionOptionId` | Exact under approved CCR-002 |
| Ordered route | Autonomous movement/action path | Ordered zone/action observations and derived path | Exact as derivation; no route-input kind |
| Qualitative judgment | Driver skill, defense effectiveness | `anchored_rating` | Exact only with behavioral anchors |
| Free exception context | Failure description | `note` | Exact as bounded fallback |
| Another team/entity | Defender team | Note or external workflow | Weak; typed context reference deferred pending strategy need |
| Relative rank among simultaneous robots | Alliance quickness rank | Anchored response plus subjective workflow constraints | Workflow concern; not a general component kind |

## Pit evidence-archetype coverage

| Evidence archetype | Public examples | Registry representation | Finding |
|---|---|---|---|
| Robot dimensions and weight | Width, length, height, weight | `measurement` with explicit unit | Covered |
| Counted inventory | Batteries | `measurement` with `count` unit or reviewed counter | Covered |
| One technical category | Drivetrain, motor, module type | `segmented_choice` | Covered |
| Multiple capabilities | Pickup and scoring locations, mechanisms | `checklist` | Covered |
| Claimed yes/no capability | Can climb, vision, floor pickup | `binary_choice` inside an attributable Pit claim | Covered |
| Preferred option | Pickup/scoring preference | `segmented_choice` | Covered |
| Claimed duration | Cycle or climb time | `measurement` with seconds and claim provenance | Covered; a live timer is not required for a Pit interview |
| Autonomous capability/route | Auto descriptions and starting areas | Structured choices/zones/checklists; bounded note for exceptional detail | Covered compositionally; season validation chooses structure |
| Reliability/repairability judgment | Maintenance and failure expectations | `anchored_rating`, structured choice, or note | Covered if anchors distinguish claim from observation |
| General comments | Mechanism or operational caveat | `note` | Covered |
| Robot photo | Identification/context image | Not an MVP component | Correctly deferred by ADR 0009 |

Pit evidence does not justify a separate Pit-only widget registry. Attribution, claim source, confidence, contributor revision, and disagreement belong to the Pit record contract rather than component payloads.

## Gap resolutions and recommendations

### CCR-001 — Categorical append action

**Finding:** Repeated mutually exclusive action outcomes recur across seasons and are explicit in the Citrus timeline. Modeling each outcome as an independent observation is valid but fragments one semantic action family and makes attempt/outcome validation harder.

**Decision:** Approved. Add `categorical_action` to registry schema version 1.

Approved shape, repeated here for traceability; the Season Package contract remains normative:

```ts
interface CategoricalActionDefinition extends ComponentDefinitionBase {
  kind: "categorical_action";
  options: ChoiceOption[];
}

interface CategoricalActionPayload {
  kind: "categorical_action";
  optionId: string;
}
```

Each activation appends one timestamped action. Definitions contain two through 12 stable options. No option is preselected, and selecting an option never replaces an earlier action. This is distinct from `segmented_choice`, which stores one replaceable response.

**Approval:** Approved by the product owner and principal architect on 2026-07-24. Normative definition, payload, bounds, interaction, accessibility, and validation rules are owned by the Season Package contract.

### CCR-002 — Categorized spatial action

**Finding:** 2018, 2019, 2023, and public 2024 schemas combine field location with action meaning or outcome. Multiple spatial observations can represent this, but they risk duplicated maps, fragmented review, and ambiguous derived heat maps.

**Decision:** Approved. Amend `zone_action` and `coordinate_action` so every definition declares one through 12 `actionOptions`, and every payload includes `actionOptionId`. A single option covers the current one-action case. This avoids optional/absent ambiguity and permits examples such as `score_cone`, `score_cube`, `made`, or `missed` without adding a generic grid component.

The renderer may present the selected action and spatial surface in either order, but the non-map alternative must collect the same action/location pair. Validation rejects an action or location not declared by the pinned definition.

**Approval:** Approved by the product owner and principal architect on 2026-07-24. Normative definition, payload, bounds, interaction, accessibility, and validation rules are owned by the Season Package contract.

### CCR-003 — Timer and cycle widgets

**Finding:** Timer/stopwatch controls recur in all three configurable widget catalogs, but Citrus demonstrates the safer raw model: ordered elapsed-time actions and explicit state entry/exit. A stored stopwatch total loses phase, correction, restart, and provenance detail.

**Decision:** Approved. Do not add `timer`, `stopwatch`, or `cycle_timer` as MVP payload kinds. Provide compiled start/stop/lap-like affordances where a `state_machine` or action definition calls for them, persist transitions/actions immediately, and derive duration or cycles. Reuse ADR 0006's device-local monotonic timing and restoration rules. A standalone timer kind is reconsidered only if empirical validation shows that existing event semantics cannot represent a necessary strategy decision.

**Approval:** Approved by the product owner and principal architect on 2026-07-24. The intentional exclusion is normative in the Season Package contract.

### CCR-004 — Typed event-entity reference

**Finding:** Attributing defense to another team appears in public configurations, but it is less recurrent than the core evidence shapes and requires event-package context rather than season-only options.

**Decision:** Defer an `entity_reference` kind. For MVP, omit the field unless strategy validation proves it necessary; a bounded note is an exception fallback, not a basis for aggregation. If approved later, define allowed entity type, event/match scope, cardinality, stale-context behavior, and stable payload identity across both Season and Event Package contracts.

**Approval status:** No current approval is required to keep the kind excluded; a future addition requires the registry extension process.

### CCR-005 — Generic slider, grid, route, and layout widgets

**Finding:** These are presentation or composition patterns rather than unique stored evidence.

**Decision:** Do not add generic payload kinds for them:

- integer buckets use `range_selector`;
- qualitative scales use `anchored_rating`;
- exact values use `measurement` or a counter where interaction evidence matters;
- grids use bounded zones plus categorized spatial actions;
- routes derive from ordered spatial/action evidence;
- grouping, headings, images, spacing, and responsive layout remain compiled UI responsibility.

**Approval status:** Covered by the existing no-remote-form-engine decision; no new approval unless that boundary changes.

## Coverage conclusion

The approved registry covers the recurring Match and Pit evidence in the studied official seasons and public systems with two evidence-supported amendments: a categorical append action and action categories on spatial actions. Timer/cycle, grid, route, slider, layout, and display widgets do not require new raw payload kinds. Typed event-entity reference remains a deferred candidate.

“Comprehensive” means that every studied evidence archetype has an exact, bounded representation or an explicit evidence-based exclusion. It does not mean closed forever. A future game can still trigger the documented extension process, but it cannot introduce a kind through package data alone.

The coverage claim is architectural, not empirical. It does not approve any season field, preset, option, rating anchor, spatial granularity, or staffing model.

## Required closure sequence

1. **Complete:** Product owner and principal architect approved CCR-001, CCR-002, and CCR-003 on 2026-07-24.
2. **Complete:** The Season Package contract, ADR 0005, configuration/payload definitions, bounds, interaction rules, accessibility rules, and canonical fixture plan incorporate the approved amendments.
3. Design prototypes every registry kind and applicable state without turning visual layout into package schema.
4. Lead Scouts and Strategists run per-observation method validation against representative video, devices, and staffing.
5. Failed fields are simplified or removed; a genuinely missing kind returns through the extension process.
6. Slice 0 implements shared validators, valid/invalid fixtures, canonical hashing vectors, compatibility checks, and cross-runtime contract tests.
7. Slice 2 implements authoring/publication and cross-resource validation only after schema version 1 is frozen.
8. Slices 4 and 5 deliver only the validated Match and Pit subsets required by the published season package.

## Revalidation triggers

Reopen this analysis when:

- an official game action cannot be represented without overloading a stored meaning;
- field validation shows materially worse accuracy, workload, attention, or accessibility from composition;
- a proposed component depends on dynamic Event Package entities;
- a future live timing or field integration changes evidence authority;
- a payload kind requires executable package behavior or unbounded content; or
- three materially different season needs repeat a currently deferred pattern.
