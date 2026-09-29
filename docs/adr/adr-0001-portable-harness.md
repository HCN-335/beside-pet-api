# ADR-0001: Portable repository harness

Date: 2026-09-29
Status: Accepted

## Context

The API repository had deployment automation but no shared agent entry point, recorded development decisions, or independent quality gate ahead of deployment. Other projects can inform the structure, while their internal code and history stay outside this public repository.

## Decision

Use `AGENTS.md` as the entry point; put constraints in `.claude/rules/`, procedures in `.claude/skills/`, and durable records in tracked Markdown indexed into a disposable `docs/docs.db`. Polydeukes judges a small set of portable disciplines. Lefthook and CI inspect committed changes independently of the agent. Default new disciplines to advice until observations justify blocking.

## Alternatives

Copying another repository's full harness would carry unrelated paths and private context. Prompt-only rules do not produce mechanical evidence. A committed SQLite database makes reviews opaque.

## Consequences

Each repository owns its own records and rules. Shared conventions appear twice because the API and web deploy independently. A cross-repository change must check both sides. New test coverage is built incrementally; the quality gate checks existing type, lint, build, and doc signals immediately.

## Reversal

Replace the two copies with a shared package only when drift becomes measurable and both repositories can adopt it without coupling their deployment cycles.
