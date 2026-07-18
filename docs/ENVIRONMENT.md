# Environment

This document tracks local configuration, credentials, and environment variables for maintainers.

## Environment Variables
- `ADMIN_EMAIL_FROM` - document whether this is required, optional, or only used in local development.
- `ANTHROPIC_API_KEY` - document whether this is required, optional, or only used in local development.
- `JWT_SECRET` - document whether this is required, optional, or only used in local development.
- `NODE_ENV` - document whether this is required, optional, or only used in local development.
- `PROGRAM_TIME_ZONE` - optional IANA time zone for program calendar dates; defaults to `America/New_York`.
- `RESEND_API_KEY` - document whether this is required, optional, or only used in local development.
- `TURSO_AUTH_TOKEN` - document whether this is required, optional, or only used in local development.
- `TURSO_DATABASE_URL` - document whether this is required, optional, or only used in local development.

## Secret-Like Local Paths
- No secret-like local paths were detected by the static scan.

## Maintainer Rules
- Use `.env.example` for shareable placeholders, never real secrets.
- Keep `credentials/`, `tokens/`, and machine-local assistant settings ignored unless a file is explicitly a sanitized fixture.
- Rotate any real credential that was accidentally committed.
