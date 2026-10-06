#!/usr/bin/env node
/**
 * Validates every migration against the real PostgreSQL grammar.
 *
 *   npm i -D libpg-query @pgsql/parser   # once, optional
 *   node scripts/check-sql.cjs
 *
 * Two passes:
 *   1. `@pgsql/parser` parses the statements (PostgreSQL 17 grammar);
 *   2. `libpg-query.parsePlPgSQL` compiles every plpgsql body — which the
 *      statement parser treats as an opaque string.
 *
 * Neither dependency is required to build or run the app, so both are loaded
 * lazily and the script explains how to install them if they are missing.
 */
const { readFileSync, readdirSync } = require('node:fs')
const { join } = require('node:path')

const dir = join(__dirname, '..', 'supabase', 'migrations')
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

function load(name) {
  try {
    return require(name)
  } catch {
    return null
  }
}

async function main() {
  const parserPkg = load('@pgsql/parser')
  const plpgsqlPkg = load('libpg-query')

  if (!parserPkg && !plpgsqlPkg) {
    console.log('Parser non installati. Per eseguire la verifica:')
    console.log('  npm i -D @pgsql/parser libpg-query')
    process.exit(0)
  }

  let failures = 0

  if (parserPkg) {
    const parser = new parserPkg.Parser({ version: 17 })
    await parser.loadParser()
    for (const name of files) {
      const sql = readFileSync(join(dir, name), 'utf8')
      try {
        const result = await parser.parse(sql)
        console.log(`✓ sintassi  ${name} — ${(result.stmts ?? []).length} statement`)
      } catch (error) {
        failures += 1
        console.error(`✗ sintassi  ${name}: ${error.message}`)
        const pos = Number(error.cursorPosition ?? 0)
        if (pos > 0) {
          console.error(`  vicino a: ${JSON.stringify(sql.slice(Math.max(0, pos - 160), pos + 60))}`)
        }
      }
    }
  }

  if (plpgsqlPkg?.parsePlPgSQL) {
    for (const name of files) {
      const sql = readFileSync(join(dir, name), 'utf8')
      try {
        const result = await plpgsqlPkg.parsePlPgSQL(sql)
        const count = Array.isArray(result) ? result.length : 0
        console.log(`✓ plpgsql   ${name} — ${count} corpi compilati`)
      } catch (error) {
        failures += 1
        console.error(`✗ plpgsql   ${name}: ${error.message}`)
      }
    }
  }

  console.log(failures === 0 ? '\nSQL valido.' : `\n${failures} verifiche fallite.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(2)
})
