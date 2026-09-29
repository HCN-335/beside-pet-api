import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const docsRoot = join(root, 'docs');
const dbPath = join(docsRoot, 'docs.db');
const areas = ['adr', 'dev-log'];
const records = areas.flatMap((area) => {
  const dir = join(docsRoot, area);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.md') && name !== 'README.md').map((name) => {
    const path = join(dir, name);
    const body = readFileSync(path, 'utf8');
    return { id: name.slice(0, -3), area, path: relative(root, path), body, title: body.match(/^# (.+)$/m)?.[1] };
  });
});
const errors = [];
const seen = new Set();
for (const row of records) {
  if (!row.title) errors.push(`${row.path}: missing H1`);
  if (seen.has(row.id)) errors.push(`${row.path}: duplicate id ${row.id}`);
  seen.add(row.id);
  if (row.body.trim().length < 80) errors.push(`${row.path}: too short`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const cmd = process.argv[2] ?? 'help';
if (cmd === 'check') { console.log(`${records.length} records valid`); process.exit(0); }
if (!['index', 'list', 'search', 'show'].includes(cmd)) {
  console.log('usage: node dev-tools/docs.mjs <index|list|search QUERY|show ID|check>'); process.exit(cmd === 'help' ? 0 : 2);
}
mkdirSync(docsRoot, { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, area TEXT, path TEXT, title TEXT, body TEXT)');
db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(id UNINDEXED, title, body)');
db.exec('DELETE FROM records; DELETE FROM records_fts');
const insert = db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?)');
const insertFts = db.prepare('INSERT INTO records_fts (id, title, body) VALUES (?, ?, ?)');
for (const row of records) { insert.run(row.id, row.area, row.path, row.title, row.body); insertFts.run(row.id, row.title, row.body); }
if (cmd === 'index') { console.log(`indexed ${records.length} records in ${relative(root, dbPath)}`); }
if (cmd === 'list') { for (const row of db.prepare('SELECT id, area, title FROM records ORDER BY id').all()) console.log(`${row.id} [${row.area}] ${row.title}`); }
if (cmd === 'show') {
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(process.argv[3]);
  if (!row) { console.error('record not found'); process.exit(1); }
  console.log(`${row.path}\n\n${row.body}`);
}
if (cmd === 'search') {
  const terms = (process.argv.slice(3).join(' ').match(/[\p{L}\p{N}_-]+/gu) ?? []).slice(0, 8);
  if (!terms.length) { console.error('search query required'); process.exit(2); }
  const query = terms.map((term) => `"${term.replaceAll('"', '')}"`).join(' OR ');
  for (const row of db.prepare('SELECT r.id, r.area, r.title FROM records_fts f JOIN records r ON r.id=f.id WHERE records_fts MATCH ? ORDER BY rank LIMIT 20').all(query)) console.log(`${row.id} [${row.area}] ${row.title}`);
}
db.close();
