# Work-Hub · Regole UI

Regole operative per scrivere interfaccia in questo repository.
I token e il razionale visivo stanno in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

---

## 1. Divieti assoluti

Non sono preferenze: sono vincoli di prodotto.

| Vietato | Perché | Al suo posto |
|---|---|---|
| Glassmorphism come linguaggio (sfondi sfocati, superfici traslucide) | Illeggibile su dati densi, invecchia male | Superficie opaca + bordo sottile |
| Neomorphism, skeuomorphism, bevel | Rumore visivo, contrasto inadeguato | `border border-line` |
| Gradienti blu/viola decorativi | Marcatore immediato di template | Pieni su token semantici |
| Blob, pattern di sfondo, effetti "futuristici" | Non sono dati | Niente |
| Ombre grandi o diffuse sulle card | Le card non galleggiano | `border border-line`, nessuna ombra |
| Card enormi per liste, ticket, righe | Spreca lo schermo, impedisce il confronto | Righe di tabella da 44px |
| `rounded-full` su qualunque cosa non sia avatar o punto di stato | Il prodotto diventa morbido e generico | `rounded-sm` (6px) per badge e chip |
| Animazioni bounce, `scale` aggressivi, parallax, loop decorativi | Il motion deve informare | Fade + translate ≤ 8px |
| Dati inventati, metriche segnaposto, lorem ipsum | Un prodotto vuoto va progettato vuoto | `EmptyState` con l'azione successiva |
| Copiare Notion, Linear, Stripe | Si prendono i principi, non le schermate | Il design system di questo repository |

---

## 2. Token prima di tutto

```tsx
// No
<div className="bg-[#1E4C44] text-white rounded-[10px] p-[18px] shadow-lg">

// Sì
<div className="bg-brand text-brand-contrast rounded-md p-4">
```

- Mai un esadecimale in un componente. Se manca un colore, si aggiunge un token.
- Mai una dimensione arbitraria quando esiste un passo della scala.
- Valori arbitrari ammessi solo per: template di griglia (`grid-cols-[180px_1fr]`),
  larghezze massime di misura (`max-w-[46ch]`), geometrie calcolate (posizione di
  un blocco nel calendario) e ricette di focus/ombra già standardizzate.
- **Mai costruire un nome di classe con un template string**
  (`` `text-${role}` ``): Tailwind non lo vede e la classe non viene generata. Si
  usa una mappa esplicita (esempio in `src/app/design-system/showcase.tsx`).

La scala tipografica **sostituisce** quella di default: `text-sm` e `text-xs` non
esistono. Se una classe tipografica non ha effetto, è perché non è un token.

---

## 3. Gerarchia

1. **Una sola azione primaria per vista.** Tutto il resto è `secondary`, `ghost` o
   `destructive`.
2. **Un solo `h1` per pagina**, reso da `<Page title=…>`.
3. I titoli di sezione sono `text-section-title`; i titoli di card
   `text-subsection-title`; le intestazioni di tabella `text-table-heading`.
4. Il colore del testo segue l'importanza: `fg` per il contenuto, `fg-secondary`
   per il supporto, `fg-muted` per i metadati. Mai `fg-disabled` per del testo che
   l'utente deve leggere.
5. Il titolo di una card non ripete quello della pagina.

---

## 4. Tabelle e liste

- Una lista di record è una **tabella**, non una pila di card.
- Riga 44px (`compact` = 36px quando la riga ha una sola unità informativa).
- Hover e selezione cambiano **solo il colore di sfondo**.
- Le colonne numeriche portano `numeric` (allineamento a destra + cifre tabulari).
- Il testo lungo tronca con `truncate`, non manda a capo.
- Ogni tabella ha una `caption` in `sr-only` con il conteggio dei risultati.
- La riga è cliccabile col mouse, ma **la via da tastiera è un elemento
  focalizzabile dentro la riga** (di norma il titolo). Una `<tr onClick>` non basta.
- Ogni lista è paginata. Non esiste un percorso "carica tutto".

---

## 5. Form

- Ogni controllo sta dentro un `<Field>`: etichetta, controllo, descrizione o
  errore. L'errore **sostituisce** la descrizione, non si somma.
- `htmlFor` + `id` sempre, anche per i controlli custom.
- La validazione è Zod, e **lo stesso schema** viene usato dal form
  (`zodResolver`) e dalla server action. Gli schemi vivono in `schemas.ts`, mai in
  un file `'use server'` (che può esportare solo funzioni async).
- **Ogni schema dev'essere applicabile al proprio output.** `zodResolver` passa
  all'handler i valori già trasformati, quindi la server action ri-valida ciò che
  lo schema ha prodotto, non ciò che l'utente ha digitato. Un campo facoltativo
  dichiarato `.optional()` che trasforma `''` in `null` fallisce al secondo
  passaggio con "Expected string, received null". I costruttori in
  `@/lib/validation` (`optionalText`, `optionalEmail`, `optionalUuid`,
  `optionalDate`, `optionalTime`) usano `.nullish()` e sono idempotenti: usa
  quelli invece di scrivere la catena a mano.
- Gli errori di campo tornano dalla action con `field`, e il form li inoltra a
  `setError` — non si mostra un toast per un errore che appartiene a un campo.
- I campi facoltativi sono marcati `optional`; gli obbligatori `required`.
- Il pulsante di invio mostra `loading`; non viene sostituito da uno spinner.

---

## 6. Overlay

| Serve per | Componente |
|---|---|
| Una decisione o un form breve | `Modal` |
| Il dettaglio di un record, con la lista ancora dietro | `Drawer` |
| Un'azione distruttiva | `ConfirmDialog` con etichetta esplicita ("Elimina ticket", mai "OK") |
| Una scelta rapida fra opzioni note | `DropdownMenu` |
| Un contenuto libero ancorato a un controllo | `Popover` |
| La spiegazione di un controllo icon-only | `Tooltip` (mai l'unica fonte dell'informazione) |

Lo stato di apertura di un overlay che rappresenta una risorsa (il drawer di un
ticket) **sta nell'URL**, non in `useState`: la vista diventa condivisibile e il
tasto "indietro" funziona.

### Due trappole, entrambe già costate un bug

**Il layout non si affida mai a `transform`.** Framer Motion scrive `transform`
sull'elemento che anima: una `-translate-x-1/2` di Tailwind sullo stesso nodo
viene cancellata, e il pannello finisce fuori asse. Si centra con flexbox su un
contenitore esterno (`pointer-events-none` sul wrapper, `pointer-events-auto`
sul pannello, così il clic raggiunge comunque lo scrim). Vale per modale,
command palette e qualunque overlay futuro.

**Un overlay che apre dall'URL aspetta l'idratazione.** Durante il render sul
server `useSearchParams()` è vuoto, quindi il pannello è chiuso; sul client è
già `?new=1`, quindi al primo render è aperto. React riconcilia i due stati
senza eseguire una transizione di apertura, e il portale non viene mai montato:
il link profondo non fa nulla, in silenzio. Si usa `useIsHydrated()` da
`@/lib/use-url-state` per forzare la sequenza onesta — chiuso al primo render,
aperto al successivo.

---

## 7. Stati

Nessuna superficie dati si considera finita senza quattro stati oltre a quello
normale:

```tsx
if (query.isError)   return <ErrorState onRetry={() => query.refetch()} />
if (query.isPending) return <TableSkeleton columns={…} />
if (rows.length === 0) return <EmptyState icon={…} title={…} action={…} />
```

- L'**empty state** distingue "non c'è ancora niente" (spiega il concetto e offre
  l'azione) da "nessun risultato per questi filtri" (suggerisce di allargare).
- Lo **skeleton** ha la geometria della tabella reale, non blocchi generici.
- L'**error state** è azionabile: dice cosa provare, non il messaggio del server.
- L'**offline** è un banner persistente, non un toast.

---

## 8. Motion

- Si anima `transform` e `opacity`. Mai `width`, `height`, `top` su elementi
  grandi (le barre dei report sono l'eccezione: sono piccole e la larghezza *è* il
  dato).
- Durate dai token. Se serve inventare una durata, probabilmente l'animazione non
  serve.
- Nessuna animazione d'ingresso su contenuto che si aggiorna da solo (refetch):
  lo stagger è riservato al primo render di una lista.
- Ogni componente che anima un valore gestisce `useReducedMotion()`.

---

## 9. Permessi nell'interfaccia

```tsx
const { can } = useSession()
{can('tickets:create') ? <Button …>Nuovo ticket</Button> : null}
```

Nascondere un pulsante è una scelta di **usabilità**, non un confine di sicurezza.
Ogni operazione è comunque verificata dalla server action e dalle policy RLS. Non
si mostra mai un controllo che produrrebbe un errore di permesso prevedibile.

---

## 10. Checklist prima di aprire una PR

**Token**
- [ ] Nessun esadecimale, nessun `px` arbitrario dove esiste un token.
- [ ] Nessun nome di classe costruito dinamicamente.

**Gerarchia**
- [ ] Una sola azione primaria, un solo `h1`.
- [ ] Ruoli tipografici corretti; `fg-muted` solo per metadati.

**Stati**
- [ ] Empty, loading, error gestiti (e offline se la vista scrive).
- [ ] Hover, focus, active, disabled e loading su ogni controllo nuovo.

**Accessibilità**
- [ ] Ogni controllo icon-only ha `label`.
- [ ] Il focus è visibile e l'ordine di tabulazione è sensato.
- [ ] Nessuna informazione affidata al solo colore.
- [ ] Ogni campo ha un'etichetta associata.

**Dati**
- [ ] Ogni query filtra per `organization_id` ed è paginata o limitata.
- [ ] Nessun N+1: le relazioni arrivano con una select annidata o un'RPC.
- [ ] La chiave della query inizia con l'id dell'organizzazione.

**Responsive**
- [ ] Verificato a 360, 768, 1024 e 1440px.
- [ ] Nessun overflow orizzontale del documento.
- [ ] Touch target ≥ 44px sui percorsi mobile.

**Verifica**
- [ ] `npm run verify` passa (lint + typecheck + build).
- [ ] Se sono cambiati i token: `node scripts/check-contrast.mjs` passa.
- [ ] Se è cambiato lo SQL: `node scripts/check-sql.cjs` passa.
