---
name: implement-prd
description: 'Implement one approved Beside Pet API leaf PRD in an isolated worktree and open a PR. Trigger: "/implement-prd", "이 PRD 구현해", a GitHub issue URL.'
---

# Implement one PRD

1. Read the approved issue and its dependencies. If it is a master, select a leaf issue instead. Use a dedicated `feat/<issue>-<scope>` branch and worktree based on the approved base branch; do not add migration work to the existing harness PR by accident.
2. Work through the issue tasks in dependency order. Search relevant ADR/dev-log records, read owning rules, and use `/tdd` for production changes. Record actual verification results in the PR body and mark issue checkboxes only when their criteria are met.
3. Run focused tests while coding, then the repository quality commands affected by the work. Preserve failing output and fix gates rather than bypassing them. Check the diff for obsolete code, security and data-compatibility risks.
4. Commit and push the leaf branch, open a PR linked to the issue, and wait for CI. Leave a clear handoff: what changed, tested behavior, data/deployment impact, and review points. Stop for `/review-worktree`; do not merge here.

`main` pushes deploy to production. Implementation authority does not authorize that deployment or infrastructure apply.
