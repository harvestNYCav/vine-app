# Architecture

This document captures the maintainer-facing structure of the repository. It is intentionally descriptive; it does not change product behavior.

## Top-Level Map
- `.gitignore` - ignored local/generated files
- `.idea/` - JetBrains IDE metadata
- `.next/` - project file or directory
- `AGENTS.md` - project file or directory
- `app/` - application/source code
- `CLAUDE.md` - project file or directory
- `content/` - project file or directory
- `data/` - fixtures, sample data, or local runtime data
- `docs/` - project documentation
- `lib/` - project file or directory
- `next-env.d.ts` - project file or directory
- `next.config.ts` - project file or directory
- `nixpacks.toml` - project file or directory
- `node_modules/` - project file or directory
- `package-lock.json` - project file or directory
- `package.json` - Node package metadata and scripts
- `postcss.config.mjs` - project file or directory
- `public/` - static assets
- `railway.toml` - project file or directory
- `README.md` - project overview
- `scripts/` - project file or directory
- `tsconfig.json` - project file or directory
- `tsconfig.tsbuildinfo` - project file or directory
- `types/` - project file or directory

## Runtime Shape
- Node/package roots: `.`.
- `app/` contains the primary application routes or runtime entry points.

## Maintenance Notes
- Keep generated output, editor metadata, virtual environments, local credentials, and machine-specific assistant settings out of Git.
- Prefer adding focused tests around stable entry points before changing application behavior.
- Update this document when directories gain or lose maintainer-facing responsibility.
