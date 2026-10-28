/**
 * Compare Drizzle schema (lib/db/schema.ts) against the live Postgres database.
 * Usage: npx tsx scripts/check-db-schema.ts
 * Optional: --sql  print suggested ALTER / CREATE statements for missing pieces
 */
import 'dotenv/config'

import { getTableColumns, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import postgres from 'postgres'

import * as schema from '../lib/db/schema'

function getDbUrl() {
  const url = process.env.DATABASE_URL || ''
  if (!url) {
    console.error('DATABASE_URL is not set (.env / environment).')
    process.exit(1)
  }
  const idx = url.indexOf('?')
  if (idx <= 0) return url
  const params = url
    .slice(idx + 1)
    .split('&')
    .filter((p) => !p.startsWith('schema='))
  return url.slice(0, idx) + (params.length ? '?' + params.join('&') : '')
}

function sslOptionFor(url: string): false | { rejectUnauthorized: false } {
  try {
    const host = new URL(url.replace(/^postgres(ql)?:/i, 'http:')).hostname
    if (host === 'localhost' || host === '127.0.0.1') return false
  } catch {
    /* ignore */
  }
  return { rejectUnauthorized: false }
}

type ColMeta = { name: string; dataType: string; columnType: string; notNull: boolean }

function expectedTables(): Map<string, ColMeta[]> {
  const out = new Map<string, ColMeta[]>()
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue
    const tableName = getTableName(value)
    const cols = getTableColumns(value)
    const list: ColMeta[] = Object.values(cols).map((c) => ({
      name: c.name,
      dataType: String(c.dataType),
      columnType: String(c.columnType),
      notNull: c.notNull,
    }))
    out.set(tableName, list)
  }
  return out
}

function suggestType(col: ColMeta): string {
  // Best-effort DDL type for ADD COLUMN IF NOT EXISTS (nullable — safe for backfill).
  switch (col.columnType) {
    case 'PgUUID':
      return 'uuid'
    case 'PgText':
      return 'text'
    case 'PgBoolean':
      return 'boolean'
    case 'PgInteger':
      return 'integer'
    case 'PgSmallInt':
      return 'smallint'
    case 'PgBigInt53':
    case 'PgBigInt64':
      return 'bigint'
    case 'PgReal':
    case 'PgDoublePrecision':
      return 'double precision'
    case 'PgNumeric':
      return 'numeric'
    case 'PgJsonb':
      return 'jsonb'
    case 'PgJson':
      return 'json'
    case 'PgTimestamp':
      return 'timestamp'
    case 'PgTimestampTZ':
    case 'PgTimestampString':
      return 'timestamptz'
    case 'PgDate':
    case 'PgDateString':
      return 'date'
    case 'PgTime':
      return 'time'
    case 'PgVarchar':
      return 'varchar'
    case 'PgArray':
      return 'text[]'
    default:
      if (col.dataType === 'string') return 'text'
      if (col.dataType === 'number') return 'integer'
      if (col.dataType === 'boolean') return 'boolean'
      if (col.dataType === 'date') return 'timestamptz'
      return 'text'
  }
}

async function main() {
  const printSql = process.argv.includes('--sql')
  const expected = expectedTables()
  const url = getDbUrl()
  const sql = postgres(url, { ssl: sslOptionFor(url), max: 1 })

  try {
    const tableRows = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `
    const existingTables = new Set(tableRows.map((r) => r.table_name))

    const colRows = await sql<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `
    const existingCols = new Map<string, Set<string>>()
    for (const r of colRows) {
      if (!existingCols.has(r.table_name)) existingCols.set(r.table_name, new Set())
      existingCols.get(r.table_name)!.add(r.column_name)
    }

    const missingTables: string[] = []
    const missingColumns: Array<{ table: string; column: string; suggest: string }> = []

    for (const [table, cols] of [...expected.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (!existingTables.has(table)) {
        missingTables.push(table)
        continue
      }
      const have = existingCols.get(table) ?? new Set()
      for (const col of cols) {
        if (!have.has(col.name)) {
          missingColumns.push({
            table,
            column: col.name,
            suggest: suggestType(col),
          })
        }
      }
    }

    console.log(`Schema tables in code: ${expected.size}`)
    console.log(`Public tables in DB:   ${existingTables.size}`)
    console.log('')

    if (missingTables.length === 0 && missingColumns.length === 0) {
      console.log('OK — no missing tables or columns vs lib/db/schema.ts')
      return
    }

    if (missingTables.length > 0) {
      console.log(`Missing tables (${missingTables.length}):`)
      for (const t of missingTables) console.log(`  - ${t}`)
      console.log('')
    }

    if (missingColumns.length > 0) {
      console.log(`Missing columns (${missingColumns.length}):`)
      for (const m of missingColumns) {
        console.log(`  - ${m.table}.${m.column}`)
      }
      console.log('')
    }

    if (printSql) {
      console.log('-- Suggested DDL (IF NOT EXISTS). Review before running.')
      console.log('-- Missing tables still need full CREATE from drizzle/migrations/*.sql')
      for (const t of missingTables) {
        console.log(`-- MISSING TABLE: ${t}  → run the matching migration file`)
      }
      for (const m of missingColumns) {
        console.log(
          `ALTER TABLE "${m.table}" ADD COLUMN IF NOT EXISTS "${m.column}" ${m.suggest};`
        )
      }
    } else {
      console.log('Tip: re-run with --sql to print suggested ALTER COLUMN statements.')
      console.log('  npx tsx scripts/check-db-schema.ts --sql')
    }

    process.exitCode = 1
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
