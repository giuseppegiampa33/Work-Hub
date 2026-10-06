# Work-Hub

SaaS multi-tenant per la gestione operativa di piccoli team: clienti, ticket,
pianificazione settimanale e consuntivazione ore. Ogni azienda è
un'**organizzazione** con i propri utenti, ruoli e dati, isolati a livello di
database.

Next.js 15 (App Router) · TypeScript · Tailwind · Radix · Framer Motion ·
TanStack Query · Zod + React Hook Form · Supabase (Auth, Postgres, Storage, RLS).

---

## Avvio in tre passi

### 1. Applica lo schema al progetto Supabase

**Questo è l'unico passaggio manuale.** Le chiavi API non possono eseguire DDL:
lo schema va applicato dal SQL editor del progetto.

1. Apri il progetto su [supabase.com](https://supabase.com) → **SQL Editor**.
2. Incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) ed esegui.
   (È la concatenazione dei file in `supabase/migrations/`, rigenerabile con
   `npm run db:schema`.)
3. Verifica:

```bash
node scripts/check-database.mjs
```

Deve stampare 17 tabelle, 12 funzioni RPC e confermare che la chiave anonima non
legge alcun dato applicativo.

### 2. Configura l'autenticazione email

In **Authentication → Providers → Email**:

- per provare subito l'app, disattiva **Confirm email** — la registrazione crea la
  sessione immediatamente;
- per un ambiente reale, lasciala attiva e configura un SMTP in
  **Authentication → Emails** (il mittente integrato di Supabase è limitato a
  poche email all'ora ed è pensato solo per i test).

In **Authentication → URL Configuration** aggiungi `http://localhost:3000/**` (e
l'URL di produzione) fra i **Redirect URLs**.

### 3. Avvia

```bash
npm install
npm run dev
```

`.env.local` è già compilato con i valori letti da `Supabase_utilities.txt`.
Il riferimento completo delle variabili è in [`.env.example`](.env.example).

Apri <http://localhost:3000>: la prima registrazione crea l'account personale,
l'onboarding crea l'organizzazione e ti rende proprietario.

Senza lo schema applicato l'app non va in errore: mostra una schermata
**"Database da inizializzare"** con le istruzioni.

---

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo. |
| `npm run build` / `npm start` | Build e avvio di produzione. |
| `npm run verify` | `lint` + `typecheck` + `build`. |
| `npm run db:schema` | Rigenera `supabase/schema.sql` dalle migrazioni. |
| `npm run db:check` | Verifica schema, funzioni e isolamento RLS sul progetto. |
| `npm run check:contrast` | Verifica WCAG di ogni coppia di colori usata. |
| `npm run check:sql` | Valida le migrazioni con la grammatica PostgreSQL 17. |

---

## Cosa fa l'applicazione

| Area | Contenuto |
|---|---|
| **Autenticazione** | Registrazione, accesso, recupero password, logout, gestione profilo e avatar. |
| **Onboarding** | Crea un'organizzazione (si diventa proprietario) oppure accetta un invito ricevuto. |
| **Dashboard** | Ticket aperti, in ritardo, da assegnare, ore della settimana; il proprio lavoro e la propria settimana; pannello "primi passi" finché lo spazio è vuoto. |
| **Ticket** | Lista filtrabile e paginata, cambio di stato e priorità in riga, drawer di dettaglio con commenti, cronologia, pianificazione, ore e allegati. |
| **Calendario** | Griglia settimanale lunedì–venerdì 08:00–18:00, creazione per clic sulla fascia oraria, consuntivazione di un'attività pianificata in ore lavorate, agenda su mobile. |
| **Clienti** | Anagrafica con ricerca e archiviazione, scheda cliente con ticket e ore. |
| **Report** | Ore per cliente, categoria e persona; andamento giornaliero; ripartizione dei ticket; registro ore paginato; esportazione CSV. |
| **Impostazioni** | Profilo, organizzazione (nome, identificativo, logo), membri e ruoli con inviti a link, categorie e tipi di attività, registro delle operazioni critiche. |
| **Design system** | `/design-system` — token, componenti, varianti e stati. |

**L'app nasce vuota.** Nessun dato demo: ogni elenco ha un empty state che spiega
il concetto e propone l'azione successiva.

---

## Multi-tenancy e sicurezza

Ogni operazione risponde a tre domande, in quest'ordine:

1. **La risorsa appartiene all'organizzazione attiva?** Ogni tabella ha
   `organization_id NOT NULL`, ogni query lo filtra, e dei trigger di integrità
   rifiutano un riferimento incrociato fra tenant (per esempio un ticket che punta
   al cliente di un'altra azienda) anche se l'UUID venisse indovinato.
2. **Chi chiama è membro di quell'organizzazione?** `is_org_member()` in RLS,
   `getAppSession()` lato server.
3. **Il suo ruolo permette questa azione?** `has_org_permission()` in RLS,
   `authorize()` nelle server action.

**Tre livelli, nello stesso ordine di importanza inverso:**

| Livello | File | Ruolo |
|---|---|---|
| Interfaccia | `src/components/app/session-provider.tsx` | Nasconde ciò che non si può fare. **Usabilità, non sicurezza.** |
| Server action | `src/lib/auth/guards.ts` | Verifica permesso e tenant, produce un messaggio comprensibile. |
| Database | `supabase/migrations/0002_rls.sql` | **Il confine reale.** Nessuna riga esce senza il consenso di una policy. |

La matrice ruoli/permessi vive in [`src/config/roles.ts`](src/config/roles.ts) ed è
rispecchiata in SQL da `public.role_has_permission()`. Vanno cambiate insieme — il
commento in entrambi i file lo ricorda.

### Ruoli

| Ruolo | Sintesi |
|---|---|
| **Proprietario** | Controllo completo, inclusa l'eliminazione dello spazio di lavoro. Un'organizzazione ne conserva sempre almeno uno (vincolo nel database). |
| **Amministratore** | Impostazioni, membri e ruoli; vede e modifica tutto. |
| **Responsabile** | Crea e assegna ticket, pianifica per tutti, gestisce clienti e tassonomia, vede i report. |
| **Operatore** | Lavora sui ticket, pianifica le proprie attività, registra le proprie ore. |
| **Ospite** | Vede solo i ticket e i clienti a cui è stato aggiunto esplicitamente. |

### Organizzazione attiva

Il tenant della sessione è in un cookie `httpOnly`, ma **non è una credenziale**:
viene rivalidato contro `organization_members` a ogni richiesta in
`getAppSession()`. Manometterlo può solo far perdere l'organizzazione attiva, mai
darne una.

### Inviti

Un amministratore o un responsabile genera un invito con email e ruolo; il sistema
crea un record con un token di 24 byte e restituisce `/invite/<token>`. Per l'MVP
il link si copia e si invia a mano: **nessun servizio email è richiesto**.

`accept_invite()` verifica token, scadenza, revoca e **corrispondenza esatta
dell'indirizzo**: un link inoltrato non è riscattabile da un altro account.
L'integrazione di un provider (Resend, SendGrid) significa chiamarlo dentro
`inviteMember` — la firma non cambia.

---

## Struttura

```
src/
  app/
    (auth)/            accesso, registrazione, recupero e reimpostazione password
    (app)/             area autenticata: dashboard, ticket, calendario, clienti,
                       report, impostazioni — guscio applicativo e guardie tenant
    auth/callback/     scambio del codice dei link email
    invite/[token]/    landing dell'invito (visibile anche da sconnessi)
    onboarding/        crea organizzazione oppure accetta un invito
    design-system/     design system vivo
  components/
    ui/                primitive del design system
    app/               guscio: sidebar, top bar, palette comandi, sessione
  config/              token, ruoli e permessi, stati ticket, navigazione, motion
  features/            un modulo per dominio: queries.ts, actions.ts, schemas.ts,
                       components/
  lib/
    auth/              sessione e guardie di autorizzazione
    supabase/          client browser, server, admin, middleware
    query/             QueryClient e fabbrica delle chiavi
supabase/migrations/   schema, RLS, funzioni, storage
scripts/               verifica database, contrasto, SQL; generazione schema
```

Convenzione di `features/`: `queries.ts` legge (hook TanStack Query sul client
Supabase del browser, con RLS attiva), `actions.ts` scrive (server action che
verificano il permesso), `schemas.ts` contiene gli schemi Zod condivisi fra i due.
Gli schemi **non** possono stare in `actions.ts`: un modulo `'use server'` può
esportare solo funzioni async.

---

## Documentazione

| File | Contenuto |
|---|---|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Token, scala tipografica, forma, motion, componenti, contrasto verificato. |
| [UI_RULES.md](UI_RULES.md) | Divieti, principi di gerarchia, checklist prima di una PR. |
| [PERFORMANCE.md](PERFORMANCE.md) | Indici, assenza di N+1, cache, peso del client, cosa misurare. |

---

## Deploy

Su Vercel: importa il repository e imposta le variabili di
[`.env.example`](.env.example). `NEXT_PUBLIC_SITE_URL` deve corrispondere al
dominio di produzione, perché è la base dei link di invito e dei redirect email,
ed è incorporata durante il build: cambiarla richiede un nuovo deploy. Aggiungi
lo stesso dominio nei **Redirect URLs** di Supabase.

`SUPABASE_SERVICE_ROLE_KEY` **non va impostata su Vercel**: nessun file
dell'applicazione importa il client service-role. Esiste come via d'uscita
documentata (`src/lib/supabase/admin.ts`, marcato `server-only`, così
importarlo da un componente client è un errore di build), ma finché non viene
usato mettere in produzione una chiave che scavalca tutte le policy è solo
superficie d'attacco.

> Una guida passo per passo con i valori già compilati per questo progetto è in
> `DEPLOY-VERCEL.txt`. Contiene credenziali reali, quindi è escluso da git e
> resta solo sulla macchina locale.
