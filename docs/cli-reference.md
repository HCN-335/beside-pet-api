# API command reference

Run these from the `beside-pet-api` root with Node.js 24 and pnpm 10.26.2. `package.json` is the source of truth for scripts. This index describes commands; it does not authorize a deployment or data change.

| Command | Purpose and effect |
| --- | --- |
| `pnpm install` | Install locked dependencies; `postinstall` attempts `lefthook install`. |
| `pnpm start` | Start the Nest API with the default environment. |
| `pnpm start:dev` | Start the API in watch mode with `NODE_ENV=development`; loads `.env.development`. |
| `pnpm start:prod` | Start the API with `NODE_ENV=production`. |
| `pnpm build` | Compile the API. |
| `pnpm lint` | Check repository files with Biome without writing fixes. |
| `pnpm format` | Format `src/` with Biome; writes files. |
| `pnpm typecheck` | Type-check and reject unused TypeScript locals and parameters. |
| `pnpm lint:fix` | Apply Biome fixes; writes files. |
| `pnpm test` | Run the Vitest suite. Use `pnpm exec vitest run <path>` for one changed test file. |
| `pnpm guard` | Explain Polydeukes disciplines and validate documentation records. |
| `pnpm docs:search "term"` | Search indexed ADR and dev-log records. |
| `pnpm docs:list` | List indexed records. |
| `pnpm docs:show <id>` | Read one indexed record. |
| `pnpm docs:index` | Rebuild the gitignored `docs/docs.db` from tracked Markdown. |
| `pnpm docs:check` | Validate documentation records. |

`postinstall` is invoked by `pnpm install`; it is not a separate onboarding step. `pnpm exec pdks explain` displays the active and draft disciplines. See [AGENTS.md](../AGENTS.md) for task routing and [.claude/skills/](../.claude/skills/) for repeatable procedures.

## Local run

1. Copy [.env.example](../.env.example) to `.env.development` and fill the required `ANTHROPIC_API_KEY` and `DATABASE_URL`. Keep the file untracked.
2. Run `docker compose up -d db` for the local Postgres service.
3. Run `pnpm start:dev`; the API listens on `http://localhost:3000`. The one-time admin setup token appears in the boot log.

`docker compose --profile full up --build` starts the full container stack and requires `ANTHROPIC_API_KEY` in the environment. Do not use real conversation data for onboarding or test examples.

## Delivery

[quality.yml](../.github/workflows/quality.yml) checks a pull request. A push to `main` starts [deploy.yml](../.github/workflows/deploy.yml), which builds and deploys the API. Keep changes on a review branch until deployment is approved.
