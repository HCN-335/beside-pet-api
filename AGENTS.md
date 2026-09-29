# Beside Pet API repository guide

This file is the shared entry point for coding agents. `CLAUDE.md` points here. Read only the rules and skills relevant to the task.

## Project map

`src/support/domain/` owns pure grief-support rules; `src/support/application/` orchestrates a turn; `src/support/infrastructure/` integrates models, knowledge and persistence; `src/support/interface/` exposes HTTP. Authentication and safety are separate modules.

## Standard commands

Use pnpm and Node.js 24. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` on a changed branch. `pnpm docs:search "term"`, `pnpm docs:list`, and `pnpm docs:show <id>` retrieve local records; `pnpm docs:index` refreshes the generated `docs/docs.db` cache.

## Knowledge ownership

- Product behavior: code and targeted tests.
- Current coding constraints: `.claude/rules/`.
- Repeatable procedures: `.claude/skills/`.
- Decisions and debugging history: Markdown sources in `docs/adr/` and `docs/dev-log/`, indexed into gitignored `docs/docs.db`.
- Mechanical verdicts: `polydeukes.config.yaml`, Lefthook, and CI. `pdks explain` lists live disciplines; drafts are not enforced.

## Task routing

- Define approved scope in a GitHub issue with `.claude/skills/prd/SKILL.md`; implement one leaf issue with `.claude/skills/implement-prd/SKILL.md`; review its finished PR with `.claude/skills/review-worktree/SKILL.md`.
- To refresh onboarding and the CLI index, use `.claude/skills/onboard/SKILL.md`.
- Before changing production code, search related ADR and dev-log records with `pnpm docs:search`, read the owning rule, and use `.claude/skills/tdd/SKILL.md`.
- For a hard-to-reverse choice, use `.claude/skills/adr/SKILL.md`.
- For a non-obvious implementation insight, use `.claude/skills/dev-log/SKILL.md`.
- For a feature with acceptance criteria, use `.claude/skills/prd/SKILL.md`.

## Boundaries

- Keep one session in one repository checkout. Do not push another repository as a side effect.
- Never put personal, customer, or pet conversation data into docs, tests, or logs.
- `main` pushes deploy automatically. Review and validate a branch before merging; do not bypass Git gates.
- Infrastructure changes and production deployment need the owner's explicit authority.
- Reuse existing functions and types when they carry the same responsibility. Remove obsolete paths after replacement. TypeScript unused checks, Biome, and tests are the mechanical backstop; duplication still needs review.
