---
name: tdd
description: Use for changes to production TypeScript code.
---
# TDD

1. Search related records (`pnpm docs:search`), read the owning rule, and inspect the caller and existing tests.
2. Write a focused failing test for the requested behavior. If no suitable harness exists for that module, establish a runnable Vitest configuration first.
3. Run only the new test and verify it fails for the expected reason.
4. Implement the smallest production change. Run the focused test until green.
5. Check neighboring tests, `pnpm typecheck`, and `pnpm lint`. Remove unused or superseded code.
6. Report the exact commands, outcomes, and any untested behavior.
