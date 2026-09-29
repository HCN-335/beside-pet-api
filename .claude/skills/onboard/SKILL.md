---
name: onboard
description: 'Refresh the Beside Pet API onboarding and command reference from current repository sources. Trigger: "/onboard", "온보딩 문서 최신화", "CLI 목록 갱신".'
---

# Keep API onboarding current

Use this skill when a newcomer needs an accurate entry point or the user asks to refresh onboarding. The deliverable is the smallest necessary update to `README.md`, `docs/cli-reference.md`, and the relevant architecture or product pages.

1. Read `git status --short` and preserve unrelated changes. Read `AGENTS.md`, `README.md`, `docs/cli-reference.md`, `.env.example`, `docker-compose.yml`, `package.json`, and relevant pages in `docs/`. Use code, tests, and workflows to verify behavior; use `pnpm docs:search` to find the reason for a non-obvious decision.
2. Compare every `package.json` script with the CLI reference. Keep the invocation, purpose, and whether it changes files or external state accurate. Record a direct CLI only if the repository actually uses it. Check local setup against the environment template and container configuration; never copy real secrets or pet conversation data into the guide.
3. Update only the pages whose claims changed. `AGENTS.md` routes agents, `README.md` introduces the project, `docs/cli-reference.md` lists commands, and architecture pages explain design. Link to the owning source instead of repeating whole rules or histories.
4. Verify the command list against `package.json`, changed local links against existing files, and changed Markdown for obvious formatting errors. Run `pnpm docs:check` for document metadata. Documentation work alone does not require a production test suite.
5. Report the updated pages, the source of each substantive correction, and anything still unverified.

A command listing is not permission to run it. A `main` push deploys automatically; follow `AGENTS.md` before any external change.
