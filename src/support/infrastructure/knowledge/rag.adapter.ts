/**
 * rag.adapter.ts — initial RAG knowledge retrieval implementation (in-memory JSON).
 * Reads rag-knowledge/grief-knowledge.json and returns chunks per task.
 * External boundary: JSON null/missing values are narrowed to concrete types here to keep the undefined discipline.
 * Can later be swapped for pgvector embedding search (the port stays the same).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { TaskId } from '@/support/domain/model/grief-task';
import type { KnowledgePort } from '@/support/domain/port/knowledge.port';
import type { KnowledgeChunk } from '@/support/domain/port/knowledge-chunk';

interface RawChunk {
  source?: unknown;
  task_id?: unknown;
  tags?: unknown;
  content?: unknown;
}

interface IndexedChunk extends KnowledgeChunk {
  taskId?: TaskId;
}

const KNOWLEDGE_PATH = join(process.cwd(), 'rag-knowledge', 'grief-knowledge.json');

const isTaskId = (value: unknown): value is TaskId =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asTags = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [];

@Injectable()
export class RagKnowledgeAdapter implements KnowledgePort {
  private readonly logger = new Logger(RagKnowledgeAdapter.name);
  private readonly chunks: IndexedChunk[] = this.load();

  async retrieve(task: TaskId, limit: number): Promise<KnowledgeChunk[]> {
    const matched = this.chunks.filter((chunk) => chunk.taskId === task);
    const pool = matched.length > 0 ? matched : this.chunks;
    return pool.slice(0, limit).map(({ source, content, tags }) => ({ source, content, tags }));
  }

  private load(): IndexedChunk[] {
    try {
      const parsed: unknown = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf-8'));
      const raw = this.extractChunks(parsed);
      return raw.map((chunk) => this.normalize(chunk));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to load knowledge base — operating with an empty index: ${reason}`);
      return [];
    }
  }

  private extractChunks(parsed: unknown): RawChunk[] {
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'chunks' in parsed &&
      Array.isArray((parsed as { chunks: unknown }).chunks)
    ) {
      return (parsed as { chunks: RawChunk[] }).chunks;
    }
    return [];
  }

  private normalize(chunk: RawChunk): IndexedChunk {
    return {
      source: asString(chunk.source),
      content: asString(chunk.content),
      tags: asTags(chunk.tags),
      taskId: isTaskId(chunk.task_id) ? chunk.task_id : undefined,
    };
  }
}
