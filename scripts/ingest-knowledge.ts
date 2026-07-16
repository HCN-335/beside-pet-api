/**
 * ingest-knowledge.ts — RAG knowledge ingestion script
 * ------------------------------------------------------------------
 * rag-knowledge/grief-knowledge.json → embedding → ingest into pgvector (grief_knowledge).
 * Run: npm run ingest
 *
 * TODO:
 *  - Wire up the embedding model (e.g. voyage / openai text-embedding). Keep the VECTOR dimension matching init.sql.
 *  - INSERT via pg Pool (source, task_id, content, embedding)
 *  - upsert / clear-existing option on re-ingestion
 */
import * as fs from 'fs';
import * as path from 'path';

interface Chunk {
  source: string;
  task_id: number | null;
  tags: string[];
  content: string;
}

async function main() {
  const file = path.join(__dirname, '..', 'rag-knowledge', 'grief-knowledge.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const chunks: Chunk[] = data.chunks;

  console.log(`Loaded ${chunks.length} chunks from grief-knowledge.json`);

  // TODO: const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  for (const c of chunks) {
    // const embedding = await embed(c.content);
    // await pool.query(
    //   'INSERT INTO grief_knowledge (source, task_id, content, embedding) VALUES ($1,$2,$3,$4)',
    //   [c.source, c.task_id, c.content, pgvector.toSql(embedding)],
    // );
    console.log(`  · [task ${c.task_id ?? '-'}] ${c.source}`);
  }

  console.log('Done. (Embedding/ingestion logic is a TODO — only the interface is in place)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
