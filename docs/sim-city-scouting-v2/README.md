# Sim-City Scouting v2 documentation

This folder contains the canonical product and architecture documentation for the greenfield, offline-first scouting system. Documents are organized by purpose, not project phase.

## Start here

1. [Product requirements](product/product-requirements.md)
2. [Architecture overview](architecture/architecture-overview.md)
3. [Architecture Decision Records](architecture/adrs/README.md)
4. [Architecture contracts](architecture/contracts/README.md)
5. [Scouting-method validation](validation/scouting-method-validation.md)
6. [V0 design constraints](design/v0-design-constraints.md)
7. [Delivery plan](delivery/delivery-plan.md)

## Source-of-truth rules

| Content | Canonical location |
|---|---|
| Product scope and acceptance | `product/product-requirements.md` |
| System boundaries and decision summary | `architecture/architecture-overview.md` |
| Consequential architecture decisions | `architecture/adrs/` |
| Data, API, security, and offline details | `architecture/contracts/` |
| Empirical scouting-method choices | `validation/scouting-method-validation.md` |
| Design handoff constraints | `design/v0-design-constraints.md` |
| Sequence, cutover, and open owners | `delivery/delivery-plan.md` |

Repository behavior remains authoritative for what currently exists. Proposed v2 documents become implementation authority only after approval. [Archived phase documents and prompts](archive/README.md) are historical inputs and must not override canonical documents.

## Approval closure and temporary review material

Approval registers, decision-review tables, clarification lists, and proposed-decision sections are temporary review aids, not permanent sources of truth. They may exist only while they contain a decision that still requires an identified approval or amendment.

After a specific decision is approved, the documentation owner must complete a repository-wide canonical-document review before removing its temporary review entry. Closure requires all of the following checks:

1. Confirm the exact approved wording, amendments, scope, approver, and any explicit deferrals from the decision history.
2. Search every canonical document for the topic, including alternate terminology, endpoint names, status labels, and earlier recommendations.
3. Record product behavior and scope in Product Requirements when the decision affects user-visible behavior, roles, operational expectations, or MVP inclusion.
4. Record consequential architecture choice, rationale, alternatives, and consequences in the appropriate ADR.
5. Record implementable data, API, security, lifecycle, offline, error, and test behavior in the appropriate contract or validation document.
6. Record only sequencing, prerequisites, delivery ownership, and acceptance gates in the Delivery Plan; it must not duplicate the approved decision as a second authority.
7. Update the Architecture Overview and design constraints only where the decision changes their summarized boundaries or handoff constraints.
8. Resolve contradictory, stale, or still-proposed wording and verify cross-document links, terminology, statuses, and formatting.
9. Perform a second trace from the approved decision to every required canonical owner and a third reverse trace from each changed canonical statement back to its governing requirement or ADR.
10. Only after those checks pass, remove the approved item from temporary approval sections. Remove an empty temporary section entirely and repair every heading link, entry criterion, or cross-reference that depended on it.

An approved item must not remain indefinitely in a temporary register as historical evidence; Git history provides that evidence. If any part of the approval remains unresolved, split out and retain only the unresolved question rather than retaining the already-approved decision. Archived documents are excluded from cleanup and remain historical only.
