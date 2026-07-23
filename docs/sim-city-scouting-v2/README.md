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
