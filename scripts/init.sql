-- pgvector 확장 + 최소 스키마 (RAG 지식 + 세션 메모)
CREATE EXTENSION IF NOT EXISTS vector;

-- 애도 지식 청크 (RAG)
CREATE TABLE IF NOT EXISTS grief_knowledge (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,         -- 출처(이론/기법명)
  task_id     INT,                   -- 관련 Worden 과제 (nullable)
  content     TEXT NOT NULL,
  embedding   VECTOR(1536)           -- 임베딩 차원은 모델에 맞춰 조정
);
CREATE INDEX IF NOT EXISTS grief_knowledge_embedding_idx
  ON grief_knowledge USING ivfflat (embedding vector_cosine_ops);

-- LangGraph checkpointer 는 라이브러리가 자체 테이블을 생성한다(PostgresSaver.setup()).
