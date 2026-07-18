# Beside Pet — Backend

NestJS + DDD로 구축한 **펫로스 정서 지지 에이전트 API**.
검증된 애도 여정 이론을 명시적 도메인 상태로 모델링하고, 대화의 흐름은 코드(오케스트레이터)가 통제하며 LLM은 각 단계 안에서 발화만 한다.

---

## 설계 원칙

> **흐름은 코드가, 발화는 모델이.** 구조(단계·진행도·안전 레벨)는 결정론적 도메인이 정하고, LLM은 공감 발화 텍스트만 채운다.

동반 대화는 흐름을 LLM의 자율 판단에 맡기면 같은 질문을 반복하거나 맴돌기 쉽다. 그래서 "다음에 무엇을 할지"는 프레임워크의 그래프가 아니라 **명시적 오케스트레이터**(`support.orchestrator.ts`)가 직접 결정한다. 한 턴의 흐름:

```
안전 확인 → 단계 전이 판단 → 지식 검색 → 공감 발화 생성 → 턴 분석 → 영속화
```

## 에이전트 구성

턴 흐름 밖에서 세 에이전트가 분석 레이어를 더한다. 모두 포트 뒤에 있어 모델·구현 교체가 자유롭다.

| 역할 | 실행 시점 | 책임 |
|------|-----------|------|
| **Planner** | 세션 시작 1회 | 애도 프로필(경로·유대 기간·상실 유형·일상 상태) → 지지 계획 수립 |
| **Supervisor** | 게이트 통과 시만 | 생성된 발화의 백그라운드 품질 점검 (단계 전이·안전 레벨 상승·샘플링 시에만 — 비용 통제) |
| **Summarizer** | 세션 종료 1회 | 세션 요약 → 세션 간 기억 |
| RAG (도구) | 매 턴 | 애도 지식 검색 (인메모리 JSON, 포트 뒤 — pgvector 교체 가능) |

## 진행도 정량화

애도 여정 4단계를 명시적 상태(`TaskId` 0=온보딩 ~ 5=클로징)로 두고, 전이 규칙은 순수 도메인 서비스(`task-progression.service.ts`)가 결정한다. 첫 답변에 바로 다음 단계로 넘어가지 않고 **결정론적 깊이 게이트**(실질적 답변인지, 몇 겹 들어갔는지)로 단계마다 머무를 시간을 준다 — "모르겠어요"도 정상 응답으로 처리해 맴돌이를 막는다.

## 안전 (Safety)

모든 턴은 발화 생성 **전에** 안전 확인을 거친다. `SupportLevel` 1(안정)/2(주의)/3(위기) — 레벨 3이면 대화를 중단하고 전문 지원 자원·헬프라인으로 연계한다(`/v1/safety/resources`).

## REST 표면

프론트가 호출하는 유일한 창구. **Claude API 키는 서버에만** 존재한다.

| 영역 | 경로 | 용도 |
|------|------|------|
| Auth | `POST /v1/auth/setup` · `login` · `logout` · `GET me` | 최초 관리자 설정(1회용 부팅 토큰) · JWT httpOnly 쿠키 로그인 |
| Admin | `/v1/admin/accounts…` | 계정 발급·회수·만료 (공개 가입 없음 — 관리자가 발급) |
| Support | `POST /v1/sessions` · `/:id/messages` (+ `/stream` SSE) | 세션 시작·사용자 턴 · 실시간 스트리밍 |
| Support | `GET /v1/sessions/:id/analysis` · `report` | 턴 분석 · 마음 리포트 |
| Safety | `GET /v1/safety/resources` | 위기 지원 자원 |

## 모델 운용

- **Claude Haiku**(`claude-haiku-4-5`) 단일 모델 — 공감 발화·판정·요약 모두. 빈도 높은 워크로드에 비용·지연 최적.
- `ANTHROPIC_API_KEY` **필수** — 없으면 부팅 시점에 명확한 에러로 종료된다 (라이브 전용).

## 영속화

`DATABASE_URL` 유무로 스위칭: 없으면 인메모리(빠른 로컬 개발), 있으면 TypeORM + Postgres. 저장소는 포트 뒤라 도메인은 차이를 모른다. 최초 관리자 계정은 env가 아니라 **부팅 로그의 1회용 setup 토큰**으로 생성한다 — 자격증명이 파일 어디에도 남지 않는다.

## 빠른 시작

```bash
pnpm install
pnpm start:dev                # http://localhost:3000 — 인메모리로 동작 (.env.development에 ANTHROPIC_API_KEY 필요)
# 부팅 로그의 setup 토큰으로 최초 관리자 생성 (POST /v1/auth/setup)

docker compose up -d db       # (옵션) Postgres — .env에 DATABASE_URL 설정
```

## 스택

NestJS · TypeScript(strict) · Claude(Haiku) · TypeORM + Postgres(옵션) · SSE · Biome · pnpm · Docker
