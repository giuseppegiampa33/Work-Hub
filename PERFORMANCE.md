# Work-Hub · Prestazioni

Obiettivo dichiarato: **un tenant al mese quaranta deve rispondere come al mese
uno.** Non è una questione di micro-ottimizzazioni: è una questione di forma delle
query. Ogni scelta qui sotto esiste per impedire che una query cresca con i dati.

---

## 1. La regola che regge tutto

> Nessuna lettura è illimitata, e ogni lettura inizia da `organization_id`.

Tre conseguenze, applicate senza eccezioni:

1. **Ogni query filtra per `organization_id`**, anche quando RLS lo farebbe
   comunque. Il filtro esplicito è ciò che permette al pianificatore di usare gli
   indici composti.
2. **Ogni lista è paginata o limitata** (`src/config/app.ts` → `PAGE_SIZE`).
3. **Ogni intervallo temporale è chiuso.** Il calendario carica una settimana, i
   report un periodo scelto. Non esiste un "tutte le ore".

---

## 2. Indicizzazione

Gli indici seguono la forma reale delle query, non la forma delle tabelle.
(`supabase/migrations/0001_schema.sql`)

| Indice | Query che serve |
|---|---|
| `tickets_org_status_idx (organization_id, status, priority, created_at desc)` | Lista ticket con filtri di stato/priorità, ordinata per data. |
| `tickets_org_assignee_idx (organization_id, assignee_id, status)` | "Assegnati a me", carico per persona. |
| `tickets_org_client_idx (organization_id, client_id, created_at desc)` | Ticket nella scheda cliente. |
| `tickets_org_due_open_idx (organization_id, due_date) WHERE status NOT IN (resolved, closed, cancelled)` | Scaduti e in scadenza. **Parziale**: l'indice non cresce con i ticket chiusi, che sono la maggioranza nel tempo. |
| `tickets_title_trgm_idx GIN (title gin_trgm_ops)` | Ricerca `ILIKE '%…%'` senza sequential scan. |
| `calendar_events_org_range_idx (organization_id, starts_at, ends_at)` | La settimana visibile. |
| `calendar_events_org_owner_range_idx (organization_id, owner_id, starts_at)` | La settimana di una persona. |
| `time_entries_org_date_idx (organization_id, entry_date desc)` | Registro ore per periodo. |
| `time_entries_org_user_date_idx`, `…_client_date_idx`, `…_category_date_idx` | I tre raggruppamenti dei report. |
| `notifications_user_unread_idx … WHERE read_at IS NULL` | Il contatore della campanella. **Parziale**: resta piccolo quanto le notifiche non lette. |
| `clients_name_trgm_idx`, `clients_org_name_idx` | Ricerca e ordinamento dei clienti. |
| `invites_pending_unique … WHERE accepted_at IS NULL AND revoked_at IS NULL` | Unicità dell'invito attivo senza bloccare lo storico. |

Gli indici parziali sono la decisione che conta di più nel lungo periodo: la parte
"calda" dei dati (ticket aperti, notifiche non lette, inviti attivi) resta di
dimensione quasi costante mentre la tabella cresce.

---

## 3. Niente N+1

Il problema classico di una lista di ticket: una query per la lista, poi una per
cliente, una per assegnatario, una per categoria. Qui non succede mai.

**Select annidate.** La lista ticket risolve tutto in un round trip:

```ts
.select(`
  id, reference, title, status, priority, due_date, …,
  client:clients!tickets_client_id_fkey(id, name),
  assignee:profiles!tickets_assignee_id_fkey(id, full_name, email, avatar_url),
  category:categories!tickets_category_id_fkey(id, name, tone)
`, { count: 'exact' })
```

I nomi espliciti delle foreign key servono perché `tickets` referenzia `profiles`
due volte (creatore e assegnatario): senza il nome del vincolo, PostgREST non
saprebbe quale join intende.

**Aggregazione nel database.** Dashboard e report non scaricano righe per sommarle
nel browser. `supabase/migrations/0003_functions.sql` contiene:

| Funzione | Sostituisce |
|---|---|
| `organization_overview(org, from, to)` | ~12 `count` separati per la dashboard. Un round trip, un oggetto JSON. |
| `report_hours_by_client / _by_category / _by_member` | Lo scarico di tutte le `time_entries` del periodo. |
| `report_daily_hours` | Serie giornaliera con `generate_series`, quindi senza buchi da riempire lato client. |
| `report_tickets_breakdown` | `GROUP BY status, priority` su indice. |
| `search_workspace(org, query, limit)` | Tre query parallele per la command palette: una sola, con limite per tipo. |

Il browser riceve decine di righe, non migliaia. È questo che tiene la pagina
report costante al crescere dello storico.

**Dati di riferimento condivisi.** Clienti, membri, categorie e tipi di attività
sono caricati una volta per sessione da `src/features/lookups/queries.ts` con
`staleTime` di 10 minuti. Aprire il form di un ticket non costa una query.

---

## 4. Cache

`src/config/app.ts` definisce quattro finestre, usate da ogni hook:

| Finestra | `staleTime` | `gcTime` | Dati |
|---|---|---|---|
| `reference` | 10 min | 30 min | Clienti, membri, tassonomia. |
| `operational` | 1 min | 10 min | Ticket, calendario, ore. |
| `analytics` | 5 min | 15 min | Dashboard e report. |
| `volatile` | 30 s | 2 min | Ricerca globale, notifiche. |

Default globali (`src/lib/query/provider.tsx`):

- `refetchOnWindowFocus: false`. Work-Hub resta aperto tutto il giorno; rifare le
  query a ogni cambio di scheda significherebbe migliaia di richieste inutili.
- `retry` fermo al primo tentativo, e **zero retry** su `42501` / `PGRST301` /
  `PGRST205`: un errore di permesso o uno schema mancante non migliorano
  riprovando, e l'utente vede subito il messaggio giusto.

**Chiavi namespaced per tenant.** Ogni chiave inizia con
`['org', organizationId, …]` (`src/lib/query/keys.ts`). Due conseguenze: cambiare
organizzazione cambia spazio di cache — nessun dato di un altro tenant può essere
servito dalla cache — e l'invalidazione si può limitare a un tenant.

**Paginazione senza sfarfallio.** Le liste usano
`placeholderData: (previous) => previous`: la pagina corrente resta visibile
mentre la successiva arriva, senza tornare allo skeleton.

---

## 5. Sessione e rendering

**Il middleware non tocca il database.** Gira a ogni navigazione, incluse le
prefetch: fa solo il refresh del token Supabase e un controllo di rotta. I controlli
di appartenenza e permesso stanno nel layout `(app)`, dove `getAppSession()` è
avvolto in `cache()` di React e viene eseguito **una volta per richiesta** anche se
layout, pagina e componenti annidati lo chiedono tutti.

**Due query per il guscio applicativo**, in parallelo: il profilo e le membership
con l'organizzazione in join.

**Server components dove i dati non cambiano in pagina** (scheda cliente,
impostazioni organizzazione): il primo paint ha già il contenuto. Client components
dove i dati si filtrano e si aggiornano (ticket, calendario, report).

---

## 6. Peso del client

Dal build di produzione:

| Rotta | Bundle di rotta | First Load JS |
|---|---|---|
| Condiviso | — | 102 kB |
| `/login` | 4,2 kB | 144 kB |
| `/dashboard` | 6,3 kB | 370 kB |
| `/tickets` | 17,6 kB | 378 kB |
| `/calendar` | 9,6 kB | 363 kB |
| `/reports` | 12,5 kB | 330 kB |

Scelte che tengono bassa questa colonna:

- `optimizePackageImports` per `lucide-react` e `date-fns`: solo le icone e le
  funzioni effettivamente importate finiscono nel bundle;
- nessuna libreria di grafici. Le misure sono barre e colonne costruite con i
  componenti del design system — qualche centinaio di byte invece di ~100 kB;
- nessuna libreria di date-picker: si usano gli input nativi `date` e `time`, che
  sono accessibili, localizzati e aprono la ruota di sistema su mobile;
- Radix è importato per primitiva, non come pacchetto unico;
- `React.memo` solo dove serve davvero (`TicketRow`), non ovunque.

---

## 7. Virtualizzazione

Valutata e **deliberatamente non adottata**: con 25 righe per pagina sui ticket e
50 sulle ore, virtualizzare aggiungerebbe complessità senza guadagno misurabile,
romperebbe lo scroll nativo e porterebbe una dipendenza in più nel bundle. Per
questo `@tanstack/react-virtual` non è installato.

`VIRTUALIZE_THRESHOLD = 60` in `src/config/app.ts` documenta la soglia. Se un
giorno si alza `PAGE_SIZE.tickets` oltre quel valore, il corpo della tabella va
virtualizzato (`npm i @tanstack/react-virtual`, `useVirtualizer` dentro
`TicketTable`): il resto del componente non cambia.

---

## 8. Scritture

- Le mutazioni passano da server action: un solo round trip, che fa anche il
  controllo di permesso e restituisce un messaggio pronto per il campo.
- Stato e priorità del ticket si aggiornano **in modo ottimistico** nella pagina
  corrente della lista, con rollback sullo snapshot precedente se il server
  rifiuta.
- L'eliminazione di un ticket usa la finestra di undo del toast: la riga sparisce
  subito, e `restoreTicket` la rimette se l'utente annulla.
- I trigger del database scrivono timeline, notifiche e audit log: non sono scritture
  aggiuntive dal client, e restano corretti anche per modifiche fatte fuori dall'app.

---

## 9. Storage

I file stanno su Supabase Storage, mai nel database. La tabella tiene solo i
metadati. Il percorso inizia con l'id che la policy del bucket controlla
(`<organization_id>/<ticket_id>/…`), quindi l'autorizzazione è decisa dalla chiave.

Limiti applicati sia nel client sia nella configurazione del bucket: avatar e logo
2 MB, allegati 10 MB, massimo 20 allegati per ticket.

---

## 10. Cosa misurare quando qualcosa rallenta

1. **La query, non il componente.** In Supabase: Database → Query Performance, in
   testa per tempo totale.
2. `EXPLAIN (ANALYZE, BUFFERS)` sulla query sospetta. Un `Seq Scan` su una tabella
   tenant significa che manca il filtro `organization_id` o l'indice non combacia.
3. Le funzioni RLS (`is_org_member`, `has_org_permission`) sono `STABLE` e in SQL
   puro: il pianificatore le valuta una volta per statement. Se diventassero
   `VOLATILE` o plpgsql, verrebbero eseguite **per riga** — è la causa più comune
   di RLS lenta.
4. Nel browser: React Query Devtools per capire se una query rifà il fetch più del
   previsto, e il pannello Network per i round trip per interazione.

---

## 11. Verifica

```bash
npm run verify              # lint + typecheck + build
node scripts/check-contrast.mjs   # contrasto WCAG di ogni coppia usata
node scripts/check-sql.cjs        # grammatica PostgreSQL 17 + corpi plpgsql
node scripts/check-database.mjs   # schema applicato e RLS attiva sul progetto
```
