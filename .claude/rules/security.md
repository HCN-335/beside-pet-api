# Privacy and deployment

- Do not log conversation text, tokens, API keys, cookies, or customer identifiers.
- Keep secrets in runtime environment configuration; never in tracked files or frontend bundles.
- Review authentication, ownership, data deletion, and crisis paths when changing adjacent code.
- A merge to `main` triggers deployment. Treat changes to `.github/workflows/`, Dockerfile, and infrastructure as production-impacting.
