#!/usr/bin/env node
/**
 * Verifies that the Work-Hub schema has been applied to the Supabase project
 * configured in .env.local, and that RLS is actually closing the door.
 *
 *   node scripts/check-database.mjs
 *
 * Exit code 0 = ready, 1 = schema missing or misconfigured.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = { ...process.env }
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(join(root, file), 'utf8')
      for (const line of raw.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
        if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    } catch {
      /* optional file */
    }
  }
  return env
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local')
  process.exit(1)
}

const TABLES = [
  'profiles',
  'organizations',
  'organization_members',
  'invites',
  'categories',
  'activity_types',
  'clients',
  'client_members',
  'tickets',
  'ticket_watchers',
  'ticket_comments',
  'ticket_attachments',
  'ticket_events',
  'calendar_events',
  'time_entries',
  'notifications',
  'audit_logs',
]

/**
 * RPC da verificare, con i nomi esatti dei parametri.
 *
 * PostgREST risolve le funzioni per *nome degli argomenti*: un POST con `{}` a
 * una funzione che ha parametri risponde 404 ("could not find the function in
 * the schema cache") anche quando la funzione esiste. Senza questi nomi la
 * verifica produrrebbe falsi allarmi.
 */
const FUNCTIONS = {
  create_organization: { p_name: '', p_slug: '' },
  accept_invite: { p_token: '' },
  invite_preview: { p_token: '' },
  my_pending_invites: {},
  organization_slug_available: { p_slug: '' },
  organization_overview: { p_org: null, p_from: null, p_to: null },
  report_hours_by_client: { p_org: null, p_from: null, p_to: null },
  report_hours_by_category: { p_org: null, p_from: null, p_to: null },
  report_hours_by_member: { p_org: null, p_from: null, p_to: null },
  report_tickets_breakdown: { p_org: null },
  report_daily_hours: { p_org: null, p_from: null, p_to: null },
  search_workspace: { p_org: null, p_query: '', p_limit: 1 },
  complete_calendar_event: {
    p_event: null,
    p_duration_minutes: null,
    p_description: null,
    p_is_billable: true,
  },
}

async function headCount(table, key) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  return response
}

let failures = 0
let serviceSpecFailed = false
const missing = []

console.log(`Project: ${url}\n`)

for (const table of TABLES) {
  const response = await headCount(table, serviceKey ?? anonKey)
  if (response.status === 404) {
    missing.push(table)
    failures += 1
  } else if (!response.ok && response.status !== 401 && response.status !== 403) {
    console.log(`? ${table.padEnd(24)} HTTP ${response.status}`)
  }
}

if (missing.length) {
  console.error(`✗ Tabelle mancanti (${missing.length}): ${missing.join(', ')}`)
  console.error('\n  Apri il SQL editor di Supabase e incolla supabase/schema.sql.')
} else {
  console.log(`✓ ${TABLES.length} tabelle presenti`)
}

// RLS smoke test: the anon key must not be able to read a single row.
if (!missing.includes('organizations')) {
  const anonRead = await fetch(`${url}/rest/v1/organizations?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  })
  if (anonRead.ok) {
    const rows = await anonRead.json()
    if (Array.isArray(rows) && rows.length > 0) {
      console.error('✗ RLS: la chiave anon legge righe da organizations')
      failures += 1
    } else {
      console.log('✓ RLS: la chiave anon non legge dati applicativi')
    }
  } else {
    console.log(`✓ RLS: anon bloccato (HTTP ${anonRead.status})`)
  }
}

/**
 * Verifica delle RPC.
 *
 * Con la chiave secret si legge direttamente lo schema OpenAPI di PostgREST:
 * è esatto e non esegue nulla. Senza, si ripiega su una chiamata per funzione
 * con i nomi dei parametri corretti (un 404 significa assente; qualunque altro
 * codice — tipicamente 400 o 401 — significa che la funzione c'è e ha rifiutato
 * gli argomenti fittizi).
 */
const fnNames = Object.keys(FUNCTIONS)
const fnMissing = []

if (serviceKey) {
  const spec = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (spec.ok) {
    const { paths = {} } = await spec.json()
    for (const fn of fnNames) {
      if (!(`/rpc/${fn}` in paths)) fnMissing.push(fn)
    }
  } else {
    console.log(`? Schema OpenAPI non leggibile (HTTP ${spec.status}), uso le chiamate dirette`)
    serviceSpecFailed = true
  }
}

if (!serviceKey || serviceSpecFailed) {
  for (const [fn, args] of Object.entries(FUNCTIONS)) {
    const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey ?? anonKey,
        Authorization: `Bearer ${serviceKey ?? anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    if (response.status === 404) fnMissing.push(fn)
  }
}

if (fnMissing.length) {
  failures += fnMissing.length
  console.error(`✗ Funzioni mancanti (${fnMissing.length}): ${fnMissing.join(', ')}`)
} else {
  console.log(`✓ ${fnNames.length} funzioni RPC presenti`)
}

console.log(failures === 0 ? '\nDatabase pronto.' : '\nDatabase non pronto.')
process.exit(failures === 0 ? 0 : 1)
