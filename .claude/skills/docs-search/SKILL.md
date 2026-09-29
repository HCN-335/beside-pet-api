---
name: docs-search
description: Retrieve prior decisions and implementation gotchas before planning or editing.
---
# Search records

Run `pnpm docs:search "topic"`; follow the returned ids with `pnpm docs:show <id>`. Use the relevant rows to shape the task, then inspect current code. The SQLite index is generated from tracked Markdown and can be rebuilt with `pnpm docs:index`.
