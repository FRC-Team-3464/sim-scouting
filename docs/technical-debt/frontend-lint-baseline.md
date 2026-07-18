# Frontend lint baseline

## Status

- **State:** Open technical debt
- **Recorded:** July 18, 2026
- **Scope:** Existing React/TypeScript source findings only
- **Related work:** Firebase session authentication, implementation Chunks 4 and 6

This document records the frontend lint findings discovered while dependency vulnerabilities were remediated. Fixing these findings is intentionally separate from the authentication and dependency-security work so behavior changes can be reviewed and tested independently.

## Reproducing the baseline

From the `frontend` directory, run:

```bash
npm run lint
```

The recorded environment uses Node.js 22, ESLint 9.39.1, and `typescript-eslint` 8.48.1. Line numbers are a snapshot and may move as source files change; the ESLint rule and affected code should be treated as the durable identifiers.

## Chunk 6 update

The session-authentication frontend migration removed obsolete cookie, password-hash, debug-whitelist, and legacy API code rather than cosmetically repairing it. This resolved 19 errors and all 3 warnings as a direct consequence of the approved behavior change. No new lint finding was introduced by the centralized API client, authentication provider, protected routes, expiration UI, or frontend tests.

Current result:

| Measurement | Count |
|---|---:|
| Files with findings | 5 |
| Errors | 21 |
| Warnings | 0 |
| Total findings | 21 |
| Automatically fixable errors reported by ESLint | 10 |

Current findings by rule:

| Severity | Rule | Count |
|---|---|---:|
| Error | `prefer-const` | 10 |
| Error | `@typescript-eslint/no-unused-vars` | 8 |
| Error | `@typescript-eslint/no-explicit-any` | 1 |
| Error | `react-hooks/immutability` | 1 |
| Error | `@typescript-eslint/no-unused-expressions` | 1 |

The remaining findings are limited to `CheckboxDropdown.tsx`, `LocalStored.tsx`, `MatchForm.tsx`, `pitScoutingForm.tsx`, and `seed.tsx`. Their remediation remains separate technical debt.

## Original Chunk 4 snapshot

| Measurement | Count |
|---|---:|
| Files with findings | 9 |
| Errors | 40 |
| Warnings | 3 |
| Total findings | 43 |
| Automatically fixable errors reported by ESLint | 20 |

The frontend production build passes despite these lint findings. Both the full and production-only frontend dependency audits report zero vulnerabilities. These facts do not make the lint findings safe to ignore; they only distinguish source-quality debt from dependency-security failures.

### Findings by rule

| Severity | Rule | Count | General concern |
|---|---|---:|---|
| Error | `prefer-const` | 20 | Variables are declared mutable even though they are never reassigned. |
| Error | `@typescript-eslint/no-unused-vars` | 11 | Imports, variables, state setters, or parameters are unused. |
| Error | `@typescript-eslint/no-explicit-any` | 6 | Values bypass TypeScript's type checking. |
| Warning | `react-hooks/exhaustive-deps` | 3 | Effects omit the `navigate` dependency. |
| Error | `react-hooks/immutability` | 1 | A component value is mutated directly. |
| Error | `react-refresh/only-export-components` | 1 | A component module also exports a non-component value. |
| Error | `@typescript-eslint/no-unused-expressions` | 1 | An expression has no assignment or observable call. |

### Findings by file

| File | Errors | Warnings |
|---|---:|---:|
| `src/components/CheckboxDropdown.tsx` | 4 | 0 |
| `src/pages/Home.tsx` | 4 | 1 |
| `src/pages/LocalStored.tsx` | 4 | 0 |
| `src/pages/Login.tsx` | 2 | 0 |
| `src/pages/MatchForm.tsx` | 8 | 1 |
| `src/pages/pitScoutingForm.tsx` | 2 | 1 |
| `src/scripts/firebase.tsx` | 6 | 0 |
| `src/scripts/seed.tsx` | 4 | 0 |
| `src/scripts/user.tsx` | 6 | 0 |

## Detailed findings

### `src/components/CheckboxDropdown.tsx`

- Line 25 — `@typescript-eslint/no-explicit-any`: the option parameter uses `any`.
- Line 26 — `react-hooks/immutability`: `optionCheck` is mutated directly instead of producing a new value.
- Line 27 — `prefer-const`: `newList` is never reassigned.
- Line 34 — `@typescript-eslint/no-unused-vars`: `boxLabel` is assigned but unused.

The direct mutation is behavior-sensitive and should be reviewed before the mechanical findings in this file are fixed.

### `src/pages/Home.tsx`

- Line 12 — `prefer-const`: `rawWhiteList` is never reassigned.
- Line 14 — `prefer-const`: `whiteList` is never reassigned.
- Line 19 — `prefer-const`: `debug` is never reassigned.
- Line 21 — `react-refresh/only-export-components`: a non-component export shares the component module.
- Line 49 — `react-hooks/exhaustive-deps`: the effect omits `navigate` from its dependency list.

### `src/pages/LocalStored.tsx`

- Line 71 — `@typescript-eslint/no-unused-vars`: `setShow` is assigned but unused.
- Line 98 — `@typescript-eslint/no-unused-expressions`: an expression has no assignment or function call.
- Line 108 — `prefer-const`: `json` is never reassigned.
- Line 173 — `@typescript-eslint/no-unused-vars`: the `e` parameter is unused.

The unused expression on line 98 may represent incomplete business logic and must not be deleted without understanding the intended behavior.

### `src/pages/Login.tsx`

- Line 1 — `@typescript-eslint/no-unused-vars`: `useEffect` is imported but unused.
- Line 1 — `@typescript-eslint/no-unused-vars`: `use` is imported but unused.

### `src/pages/MatchForm.tsx`

- Line 1 — `@typescript-eslint/no-unused-vars`: `JSX` is imported but unused.
- Line 24 — `react-hooks/exhaustive-deps`: the effect omits `navigate` from its dependency list.
- Line 31 — `@typescript-eslint/no-unused-vars`: `showCheckboxes` is assigned but unused.
- Line 31 — `@typescript-eslint/no-unused-vars`: `setShowCheckboxes` is assigned but unused.
- Line 59 — `@typescript-eslint/no-unused-vars`: `setTransitionCollected` is assigned but unused.
- Line 163 — `prefer-const`: `samjohn` is never reassigned.
- Line 163 — `@typescript-eslint/no-unused-vars`: `samjohn` is assigned but unused.
- Line 176 — `prefer-const`: `check` is never reassigned.
- Line 239 — `prefer-const`: `val` is never reassigned.

### `src/pages/pitScoutingForm.tsx`

- Line 25 — `react-hooks/exhaustive-deps`: the effect omits `navigate` from its dependency list.
- Line 52 — `prefer-const`: `check` is never reassigned.
- Line 89 — `prefer-const`: `val` is never reassigned.

### `src/scripts/firebase.tsx`

- Line 21 — `@typescript-eslint/no-explicit-any`: a function parameter or value uses `any`.
- Line 24 — `prefer-const`: `body` is never reassigned.
- Line 47 — `@typescript-eslint/no-explicit-any`: a function parameter or value uses `any`.
- Line 58 — `@typescript-eslint/no-explicit-any`: a function parameter or value uses `any`.
- Line 125 — `prefer-const`: `res` is never reassigned.
- Line 127 — `prefer-const`: `data` is never reassigned.

This module is part of the existing frontend API abstraction despite its historical filename. Type changes should preserve the current request and response shapes until the planned authentication migration updates the API client.

### `src/scripts/seed.tsx`

- Line 45 — `prefer-const`: `robotErrorCheck` is never reassigned.
- Line 57 — `prefer-const`: `randNum` is never reassigned.
- Line 57 — `@typescript-eslint/no-unused-vars`: `randNum` is assigned but unused.
- Line 101 — `prefer-const`: `baseJsonList` is never reassigned.

### `src/scripts/user.tsx`

- Line 8 — `prefer-const`: `date` is never reassigned.
- Line 14 — `@typescript-eslint/no-explicit-any`: a function parameter or value uses `any`.
- Line 16 — `prefer-const`: `nameEQ` is never reassigned.
- Line 17 — `prefer-const`: `ca` is never reassigned.
- Line 25 — `@typescript-eslint/no-explicit-any`: a function parameter or value uses `any`.
- Line 31 — `prefer-const`: `cookieString` is never reassigned.

This module contains legacy browser-cookie authentication helpers. Coordinate its cleanup with the planned frontend session-authentication migration so obsolete code is removed rather than cosmetically repaired and then deleted.

## Recommended remediation order

1. Add or identify tests for the affected login, locally stored scouting, match scouting, pit scouting, checkbox, and cookie behavior.
2. Review the behavior-sensitive findings: direct mutation, the unused expression, effect dependencies, and Fast Refresh module boundaries.
3. Replace `any` with explicit request, response, form, and option types.
4. Remove genuinely unused imports, state, variables, and parameters after confirming they are not incomplete business logic.
5. Apply the mechanical `prefer-const` changes in a separate reviewable commit.
6. Run lint, the production build, and the relevant browser workflows after every behavior-sensitive group.

Do not resolve this baseline by disabling rules globally, adding blanket ESLint suppression comments, or running an automatic fix without reviewing the resulting behavior changes.

## Completion criteria

This technical debt is complete when:

- `npm run lint` exits successfully with zero errors;
- every remaining warning, if any, has an explicit reviewed decision;
- `npm run build` passes;
- affected user workflows have repeatable tests or documented browser verification;
- no authentication, offline-storage, or scouting behavior regresses; and
- this baseline is updated or removed so it does not continue reporting obsolete counts.
