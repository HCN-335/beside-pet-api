# 02 · 시스템 아키텍처 (전체)

> 프론트 ↔ 백엔드 ↔ 데이터까지 한눈에. 세부는 [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) · [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md).

---

## 1. 한 장 그림

```
 [ Next.js 프론트 ]                  [ NestJS 백엔드 ]                    [ 데이터 ]
                                                                          
 채팅 UI · 진행도 표시   ──REST──▶   SessionController                    
 (API 키 없음)          POST /sessions          │                        
                        POST /sessions/:id/messages                      
                                          │                              
                                          ▼                              
                                   LangGraph 상태 그래프 ───┬──▶ Claude API (키는 서버 전용)
                                   (흐름 통제)              │
                                   supervisor·counselor    ├──▶ pgvector (RAG 검색)
                                   grader·safety            │
                                          │                 └──▶ Langfuse (트레이싱·관측)
                                          ▼                              
                                   GraphState (단일 상태) ──────▶ PostgreSQL
                                                              (checkpointer + JSONB + vector)
```

핵심 분업:
- **프론트**는 화면·입력·진행도 표시만. **API 키를 절대 갖지 않는다.**
- **백엔드**가 흐름·발화·판정·안전·검색을 모두 책임진다.
- **LangGraph가 "다음에 무엇을 할지"를 통제**하고, Claude는 노드 안에서 발화만 한다 — 흐름 제어는 모델이 아니라 코드의 책임.

## 2. 프론트 ↔ 백엔드 계약 (REST)

프론트는 **단 두 개의 엔드포인트**만 호출한다 (`backend/src/session/session.controller.ts`).

| 메서드 | 경로 | 용도 | 요청 | 응답(개념) |
|--------|------|------|------|-----------|
| POST | `/sessions` | 새 세션 시작 | `{ sessionId, griefPath, seed? }` | 초기 발화 + 진행 상태 |
| POST | `/sessions/:id/messages` | 사용자 턴 전송 | `{ text }` | 봇 발화 + 갱신된 진행 상태 |

> 프론트는 상담 로직을 전혀 모른다. "텍스트를 보내면 발화와 진행도가 돌아온다"만 안다. 흐름·상태·모델은 전부 서버 뒤에 있다.

## 3. 단일 상태 (Single Source of Truth)

모든 노드가 하나의 `GraphState`를 읽고 쓴다 (`backend/src/state/graph-state.ts`). 이 상태 하나가 **무한루프 방지·진행도 정량화·세션 이어받기**를 전부 떠받친다.

| 필드 | 역할 | 어떤 벽을 해결하나 |
|------|------|--------------------|
| `currentTask` / `taskCompletion` | Worden 4과제 진행 | 진행도 측정 불가 |
| `askedQuestions` | 이미 한 질문 기록 → 재질문 금지 | 같은 질문 반복 |
| `retryCount` (+ `MAX_RETRY=2`) | 재시도 한도 → 폴백 전이 | 무한루프 |
| `mode` (`loss`↔`restoration`) | 이중과정모델 모드 전환 | 슬픔 맴돌이 |
| `riskTier` | 위기 등급 (3=전문 연계) | 안전 |
| `memory` | 세션 간 기억 (지속적 유대) | 세션 리셋 |

진행률은 단순 계산으로 떨어진다: `overallProgress = 완료 과제(≥0.6) 수 / 4`.

## 4. 데이터 저장 전략

| 데이터 | 저장소 | 이유 |
|--------|--------|------|
| 그래프 상태 | PostgreSQL (checkpointer 직렬화) | 세션 간 이어받기 |
| 채팅 본문 | PostgreSQL **JSONB** | raw 보존, 스키마 유연 |
| 임베딩 | **pgvector** | RAG 검색 |
| 미디어(음성/이미지) | S3 (DB엔 참조만) | 용량·비용 ※ 향후 |

> NoSQL을 따로 두지 않고 **Postgres 한 시스템**으로 관계형 + 문서(JSONB) + 벡터(pgvector)를 커버 — 초기 규모에 최적. `raw → 가공(ETL) → 인사이트` 레이어를 분리하고, 인사이트는 동의·비식별·집계를 전제로 한다.

## 5. 모델 운용

| 용도 | 모델 | 이유 |
|------|------|------|
| 공감 발화 (Counselor) | Claude **Sonnet** | 공감 품질 |
| 판정·요약 (Grader, Summarizer) | Claude **Haiku** | 저렴·고빈도 |

> 모델 선택은 **흐름 구조가 정해진 뒤**의 비용/품질 최적화 문제로만 다룬다. 흐름 제어를 상태 그래프가 책임지므로, 발화 모델은 역할별로 교체·최적화할 수 있다.

## 6. 관측·평가

- **Langfuse** — 트레이싱으로 "어떤 노드가 어떤 근거로 무엇을 발화했는지" 가시화 → 답변 품질을 관측 가능하게.
- **RAGAS** — RAG 답변의 근거 충실도 평가 → 프롬프트/검색 변경의 개선 루프를 닫는다.

## 7. 인프라 / 배포

- **로컬**: `docker compose up`(Postgres+pgvector) + 앱은 호스트(`npm run start:dev`).
- **배포(필요 시)**: 단일 컨테이너 → Railway/Fly.io/AWS. 1차 슬라이스 단계에선 로컬 데모로 충분.
- **보안**: API 키 서버사이드 전용, `.env` 비커밋, 위기 자원은 항상 무료.

## 8. 의도적으로 제외한 것

로그인 · 결제 · 모바일 · 프로덕션 배포 인프라. **핵심 한 줄기(무한루프 방지)가 진짜로 도는 것**에 집중하기 위한 선택. (→ [01-product-overview.md](01-product-overview.md) §6 스코프)
