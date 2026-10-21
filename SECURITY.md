# Security Policy

KodiSalama stores sensitive personal data (tenant names, phone numbers, NIDA numbers, payment records). We take its security seriously.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Instead, use GitHub's [private vulnerability reporting](https://github.com/galaxymushizo-netizen/kodisalama/security/advisories/new), or contact the maintainer directly. Include:

- A description of the issue and its impact
- Steps to reproduce or a proof of concept
- Affected version/commit

You can expect an initial response within 7 days. Once a fix is released, reporters are credited (unless they prefer otherwise).

## Deployment security checklist

- Set a strong `APP_PASSWORD` (12+ characters) and a unique `APP_SESSION_SECRET`
- Serve over HTTPS in production (HSTS is enabled automatically)
- Keep PostgreSQL inaccessible from the public internet
- Download regular JSON backups (Mipangilio → Backup) and store them safely — they contain personal data
