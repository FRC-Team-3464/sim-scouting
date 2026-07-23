# V0 design constraints

**Status:** Required constraints for design exploration

V0 may explore visual direction and repository-aware prototypes. Generated code is not production-ready and must not establish architecture contracts.

## Locked constraints

- React, TypeScript, Vite, React Router, Tailwind CSS v4
- Assignment-driven Scout workspace first
- Neutral high-contrast base with persistent labeled alliance cues
- Phone-first Match Mode; tablet adds spatial context; desktop prioritizes management/review
- Local-first actions, explicit save/queue/sync states, and no network-blocked capture
- Persistent match identity, phase/timer, last action, and undo during capture
- Unanswered, not observed, and not applicable are distinct from false/zero
- Controlled season components, not arbitrary JSON forms
- Explore a zone-based spatial input with an accessible non-map alternative
- Treat coordinates as an optional comparison, not a required mode
- At least 44×44 CSS-pixel targets; frequent actions target 56×56 or larger
- WCAG 2.2 AA, keyboard correction, screen-reader semantics, reduced motion, 200% zoom, 320-pixel reflow, and safe-area handling
- Visible feedback is authoritative; haptics are optional

## Must represent

Assignment queue, pre-match scheduled and manual fallback, Auto, active/inactive periods, End Game, post-match review, action history/undo, local/queued/uploading/synced/rejected/conflict/auth-required/storage/update states, lead data-quality review, and structured Pit Scouting that remains complete with no photo controls.

## Must not lock before validation

- Exact, batch, made/missed, cycle, rate, or range method as universal default
- Quantity/accuracy buckets
- Whether zones, coordinates, or a non-spatial control is the validated default for each observation; do not imply that a zone-based exploration has already won
- Timer-driven versus manual correction presentation
- Rating anchors
- Per-observation confidence prompts
- Dedicated versus reduced-staffing layouts
- Phone/tablet control density

## Architecture-risk warnings

Reject designs that require direct Firestore, assume background sync, store sync state in canonical records, require online launch, require pit photos, show an MVP photo-upload flow, put images in scouting JSON, hide assignment/version conflict, use `debug` as privilege, silently merge scouts, or imply legacy compatibility.
