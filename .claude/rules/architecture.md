# API architecture

- Domain logic under `src/support/domain/` must not depend on NestJS, TypeORM, or model SDKs.
- Application use cases orchestrate domain and ports. HTTP controllers translate requests and responses only.
- Model calls stay in infrastructure LLM adapters. Run safety checks before generation and keep crisis handoff deterministic.
- Persist a completed turn consistently; report generation and deletion follow their documented gates.
- Add database changes through migrations. Never rewrite an applied migration.
