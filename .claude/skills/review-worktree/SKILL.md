---
name: review-worktree
description: 'Review a finished Beside Pet API PRD worktree against its issue and CI, fix findings on its branch, and stop before merge. Trigger: "/review-worktree", "작업 트리 리뷰".'
---

# Review a completed PRD wave

1. Read the leaf issue, PR body, changed files, and CI result. Confirm the worktree is clean and the branch contains only this issue's scope. Compare the PR against the issue's acceptance criteria and current `main` using the merge base.
2. Review behavior, auth and ownership, safety, persistence compatibility, stream contracts, tests, and deployment effects relevant to the change. Verify important claims with targeted commands. Fix confirmed findings inside the worktree branch and rerun the affected checks.
3. Push review fixes and wait for CI. Report remaining risks, exact evidence, rollback impact, and whether the PR is ready for the owner's decision.

Stop before merge. A merge into `main` starts production deployment and needs the owner's explicit approval.
