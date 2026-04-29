#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_WEB = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_WEB, '..', '..');
const MIGRATIONS_DIR = path.join(APP_WEB, 'supabase', 'migrations');
const DOCS_PLANS = path.join(REPO_ROOT, 'docs', 'plans');

/** @returns {{ name: string, body: string }[]} */
function readMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({
      name: `apps/web/supabase/migrations/${f}`,
      body: fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'),
    }));
}

/**
 * Extract SOURCE-marked sql blocks from a markdown file.
 * @param {string} mdPath
 * @returns {{ source: string, body: string, mdFile: string, startLine: number }[]}
 */
function extractSqlBlocksFromMd(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const sourceMatch = lines[i].match(/<!--\s*SOURCE:\s*(.+?)\s*-->/);
    if (!sourceMatch) continue;

    const source = sourceMatch[1].trim();

    // Find the next ```sql block within 4 lines after the marker
    for (let j = i + 1; j <= i + 4 && j < lines.length; j++) {
      if (lines[j].trimStart().startsWith('```sql')) {
        const startLine = j + 1;
        const bodyLines = [];

        for (let k = j + 1; k < lines.length; k++) {
          if (lines[k].trimStart().startsWith('```')) break;
          bodyLines.push(lines[k]);
        }

        results.push({
          source,
          body: bodyLines.join('\n'),
          mdFile: mdPath,
          startLine,
        });
        break;
      }
    }
  }

  return results;
}

/** @param {string} s */
function normalizeSql(s) {
  return s
    .split('\n')
    .map((line) => line.replace(/--.*$/, '').trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {string} a @param {string} b @returns {string[]} */
function simpleDiff(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const diff = [];
  const maxLen = Math.max(aLines.length, bLines.length);

  for (let i = 0; i < maxLen && diff.length < 10; i++) {
    const la = aLines[i];
    const lb = bLines[i];
    if (la !== lb) {
      if (la !== undefined) diff.push(`  < ${la}`);
      if (lb !== undefined) diff.push(`  > ${lb}`);
    }
  }
  return diff;
}

function main() {
  // 1. Read migration files
  const migrations = readMigrations();

  // 2. Collect all docs/plans .md files
  const mdFiles = [];
  if (fs.existsSync(DOCS_PLANS)) {
    const scan = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (entry.name.endsWith('.md')) mdFiles.push(full);
      }
    };
    scan(DOCS_PLANS);
  }

  // 3. Extract SOURCE-marked sql blocks from all md files
  const sqlBlocks = mdFiles.flatMap((f) => {
    try { return extractSqlBlocksFromMd(f); }
    catch { return []; }
  });

  // 4. Build migration map for quick lookup
  /** @type {Map<string, string>} source -> body */
  const migMap = new Map(migrations.map((m) => [m.name, m.body]));

  // 5. Match and compare
  let matchedPairs = 0;
  let mismatches = 0;
  const orphanMarkers = []; // blocks with SOURCE pointing to non-existent .sql
  const mismatchDetails = [];

  for (const block of sqlBlocks) {
    if (!migMap.has(block.source)) {
      orphanMarkers.push(block);
      continue;
    }

    matchedPairs++;
    const migBody = migMap.get(block.source);
    const normMig = normalizeSql(migBody);
    const normBlock = normalizeSql(block.body);

    if (normMig !== normBlock) {
      mismatches++;
      const relMd = path.relative(REPO_ROOT, block.mdFile);
      const diff = simpleDiff(migBody.trim(), block.body.trim());
      mismatchDetails.push({ source: block.source, mdFile: relMd, startLine: block.startLine, diff });
    }
  }

  // 6. Find orphan migrations (sql files not referenced by any marker)
  const referencedSources = new Set(sqlBlocks.map((b) => b.source));
  const orphanMigrations = migrations.filter((m) => !referencedSources.has(m.name));

  // 7. Output
  const totalSqlFiles = migrations.length;
  const sqlFileLabel = totalSqlFiles === 1 ? '.sql file' : '.sql files';

  console.log('\nMigration drift check');
  console.log('─────────────────────');
  console.log(`Migrations found:    ${totalSqlFiles} ${sqlFileLabel}`);
  console.log(`SQL blocks scanned:  ${sqlBlocks.length} blocks (with SOURCE marker)`);

  if (totalSqlFiles === 0) {
    console.log(`Matched pairs:       0 (no migration files yet — phase 0a will create them)`);
  } else {
    console.log(`Matched pairs:       ${matchedPairs}`);
  }

  console.log(`Mismatches:          ${mismatches}`);
  console.log(`Orphan markers:      ${orphanMarkers.length} (SQL blocks reference future migrations — expected during partitioning)`);
  console.log(`Orphan migrations:   ${orphanMigrations.length} (sql files without doc reference)`);

  if (orphanMigrations.length > 0) {
    console.log('\nWarning — migrations not referenced in any doc:');
    for (const m of orphanMigrations) {
      console.log(`  ! ${m.name}`);
    }
  }

  if (mismatches === 0) {
    const checkedCount = matchedPairs;
    console.log(`\n✓ drift 없음 (검사 ${checkedCount}개 블록)`);
    process.exit(0);
  } else {
    console.log('\n✗ DRIFT DETECTED:\n');
    for (const d of mismatchDetails) {
      console.log(`  ${d.source}`);
      console.log(`  ↔ ${d.mdFile}:${d.startLine}`);
      console.log('\n  Diff (first 10 lines):');
      for (const line of d.diff) {
        console.log(`   ${line}`);
      }
      console.log();
    }
    process.exit(1);
  }
}

main();
