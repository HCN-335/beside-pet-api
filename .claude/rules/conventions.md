# Coding conventions

- Search for the existing contract and caller before adding a helper, type, or dependency.
- Put a responsibility in one owner module. Delete a superseded implementation and update its callers in the same change.
- Keep unused locals and parameters at zero (`pnpm typecheck`). Avoid new `any`, silent fallbacks, and `eslint`/Biome suppressions without a reason.
- Pair behavior changes with focused tests. Do not claim a test was run unless it was run.
- Keep public README claims aligned with implemented behavior; label planned work as planned.
