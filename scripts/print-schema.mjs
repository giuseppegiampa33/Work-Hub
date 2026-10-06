#!/usr/bin/env node
/**
 * Concatenates supabase/migrations/*.sql into supabase/schema.sql so the whole
 * schema can be applied with a single paste into the Supabase SQL editor.
 *
 *   node scripts/print-schema.mjs            # writes supabase/schema.sql
 *   node scripts/print-schema.mjs --stdout   # prints instead of writing
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase', 'migrations')

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const header = `-- =============================================================================
-- Work-Hub · consolidated schema
-- Generated from supabase/migrations by scripts/print-schema.mjs — do not edit.
-- Apply once in the Supabase SQL editor, then re-run after pulling migrations.
-- =============================================================================

`

const body = files
  .map((name) => `\n-- >>> ${name} ${'='.repeat(Math.max(0, 70 - name.length))}\n\n${readFileSync(join(migrationsDir, name), 'utf8')}`)
  .join('\n')

const output = header + body

if (process.argv.includes('--stdout')) {
  process.stdout.write(output)
} else {
  const target = join(root, 'supabase', 'schema.sql')
  writeFileSync(target, output, 'utf8')
  console.log(`Wrote ${target} from ${files.length} migration(s): ${files.join(', ')}`)
}
