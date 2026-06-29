# Dependencies

Use this as the maintainer checklist for dependency updates and reproducible setup.

## Inventory
- `.` Node package: 11 runtime deps, 8 dev deps, lockfile `package-lock.json`.

## Update Guidance
- Prefer lockfile-preserving installs when a lockfile exists.
- Run the verification commands in `docs/MAINTENANCE_AUDIT.md` after dependency updates.
- Keep dependency updates separate from product behavior changes so regressions are easier to review.
- If a broad version range is intentional, document why before widening it further.
