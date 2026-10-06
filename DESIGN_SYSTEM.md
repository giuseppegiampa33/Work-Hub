# Work-Hub · Design system

Linguaggio visivo: **operational editorial SaaS**. Superfici piatte, linee sottili,
profondità solo dove qualcosa galleggia davvero. L'interfaccia deve sembrare uno
strumento di lavoro quotidiano, non una landing page.

La pagina `/design-system` renderizza i componenti **reali** del repository: se un
token cambia, la pagina cambia. Nessuno screenshot, nessuna copia.

---

## 1. Principi

| Principio | Conseguenza concreta |
|---|---|
| **La densità è una funzionalità** | Riga tabella 44px (36px compatta), titoli brevi, numeri tabulari. Lo schermo serve a confrontare venti righe, non a riempire spazio. |
| **La linea raggruppa, l'ombra solleva** | Un bordo da 1px separa meglio di un'ombra. Le ombre esistono solo per popover, menu, drawer, modali e toast. |
| **Il colore classifica, il testo spiega** | Nessun badge senza etichetta. Il colore è il secondo canale, mai il primo. |
| **Il motion informa** | Fade e translate brevi che dicono *da dove arriva* una cosa. Nessun bounce, nessuno scale, nessun parallax. |
| **Il vuoto è uno stato di progetto** | Ogni superficie dati ha empty, loading, error e offline. Un prodotto nasce vuoto: è il primo stato che l'utente vede. |

---

## 2. Token

Fonte unica: [`src/config/tokens.ts`](src/config/tokens.ts).

`tailwind.config.ts` legge quel file due volte: una per costruire il tema Tailwind,
una (tramite un plugin di tre righe) per emettere ogni valore come custom property
su `:root`. Non esiste un file generato da tenere allineato.

```ts
// tailwind.config.ts
const c = (token: ColorToken) => `rgb(var(--color-${token}) / <alpha-value>)`
```

I colori sono emessi come **canali RGB** (`--color-brand: 30 76 68`) così i
modificatori di opacità di Tailwind (`bg-brand/10`) continuano a funzionare.

### 2.1 Colore

I token hanno nomi di **ruolo**, mai di tinta: `--color-danger`, non `--color-red`.

| Gruppo | Token | Uso |
|---|---|---|
| Canvas | `canvas`, `canvas-sunken` | Sfondo dell'applicazione. Off-white caldo `#F6F6F3`, mai bianco ottico. |
| Superfici | `surface`, `surface-muted`, `surface-sunken`, `surface-hover`, `surface-active`, `surface-selected` | Contenitori che poggiano sul canvas. |
| Linee | `line-subtle`, `line`, `line-strong` | Separazione e raggruppamento. |
| Testo | `fg`, `fg-secondary`, `fg-muted`, `fg-disabled`, `fg-inverse` | Antracite morbido `#1C1C1A`, mai nero assoluto. |
| Brand | `brand`, `brand-hover`, `brand-active`, `brand-contrast`, `brand-subtle`, `brand-subtle-hover`, `brand-line`, `brand-text` | Verde petrolio `#1E4C44`. Azioni primarie e selezione. |
| Stato | `success`, `warning`, `danger`, `info`, `neutral` | Ognuno in quartetto: pieno, `-subtle`, `-line`, `-text`. |

**La regola del quartetto.** Ogni colore di stato viaggia con quattro varianti:
il pieno (per un pulsante o una barra), il riempimento tenue (per un badge), la
linea (per il bordo del badge) e il tono del testo (leggibile sul riempimento
tenue). È questo che rende un badge leggibile senza affidare il significato al
colore.

### 2.2 Contrasto — verificato, non dichiarato

```bash
node scripts/check-contrast.mjs
```

Lo script legge i valori direttamente da `tokens.ts` e verifica 27 coppie
effettivamente usate nell'interfaccia. Stato attuale: **tutte le coppie superano
il minimo richiesto**.

| Coppia | Rapporto | Minimo |
|---|---|---|
| `fg` / `canvas` | 15,76:1 | 4,5:1 |
| `fg-secondary` / `canvas` | 7,39:1 | 4,5:1 |
| `fg-muted` / `canvas` | 5,12:1 | 4,5:1 |
| `brand-contrast` / `brand` | 9,67:1 | 4,5:1 |
| `warning-text` / `warning-subtle` | 7,05:1 | 4,5:1 |
| `danger-text` / `danger-subtle` | 8,22:1 | 4,5:1 |
| `fg-disabled` / `surface` | 3,26:1 | 3:1 |

`fg-muted` è il tono più chiaro ammesso per testo informativo: metadati, didascalie
e contatori restano sopra 4,5:1 su tutte le superfici. `fg-disabled` è riservato a
placeholder e controlli inattivi.

### 2.3 Tipografia

**Plus Jakarta Sans** (via `next/font`, self-hosted, `display: swap`).

Una scala per **ruolo**: nessuna pagina inventa una dimensione.

| Token | Dimensione / interlinea | Uso |
|---|---|---|
| `text-display` | 28 / 34, −0.02em, 600 | Titolo di schermate a colonna singola (auth, onboarding). |
| `text-page-title` | 22 / 28, 600 | Titolo di pagina applicativa. |
| `text-section-title` | 16 / 22, 600 | Titolo di sezione, header di drawer e modale. |
| `text-subsection-title` | 14 / 20, 600 | Titolo di card. |
| `text-table-heading` | 11 / 16, +0.06em, 600, uppercase | Intestazioni di tabella e micro-titoli. |
| `text-body` | 14 / 21 | Testo di lettura. |
| `text-body-sm` | 13 / 19 | Testo denso: righe di tabella, liste. |
| `text-meta` | 12 / 18 | Metadati e descrizioni di campo. |
| `text-label` | 12 / 16, 500 | Etichette di form. |
| `text-caption` | 11 / 15 | Note, timestamp, contatori. |
| `text-metric` | 24 / 28, 600 | Valore di una stat tile. |

**Cifre tabulari.** L'attributo `data-numeric` attiva `font-variant-numeric:
tabular-nums`: va su durate, ore, date, contatori e qualunque colonna di numeri che
deve allinearsi verticalmente. **Non** su un valore grande e isolato (il titolo di
una stat tile): a quella dimensione le cifre a larghezza fissa fanno sembrare il
numero slegato.

### 2.4 Forma

| Token | Valore | Uso |
|---|---|---|
| `rounded-xs` | 4px | Micro-elementi: tacche di priorità, checkbox, barre. |
| `rounded-sm` | 6px | Badge, chip, voci di menu, pulsanti piccoli. |
| `rounded-md` | 8px | Pulsanti, campi, popover, menu. |
| `rounded-lg` | 12px | Card, tabelle, modali. |
| `rounded-xl` | 16px | **Solo** bottom sheet su mobile. |
| `rounded-full` | — | **Solo** avatar e punti di stato. |

Spaziatura su griglia 4px. I passi da 2px (`0.5`, `1.5`, `2.5`, `3.5`) esistono per
le correzioni ottiche e per i box delle icone, non per il layout.

### 2.5 Profondità

| Token | Uso |
|---|---|
| `shadow-popover` | Popover, dropdown, select, combobox. |
| `shadow-overlay` | Modali e command palette. |
| `shadow-drawer` | Drawer laterale. |
| `shadow-toast` | Toast. |

**Card e righe non hanno ombra.** Mai. Il raggruppamento è `border border-line`.

### 2.6 Motion

| Token | Valore | Uso |
|---|---|---|
| `duration-instant` | 80ms | Highlight di una voce di menu. |
| `duration-fast` | 140ms | Hover, focus, uscite. |
| `duration-standard` | 180ms | Cambio di stato. |
| `duration-moderate` | 220ms | Ingresso di modale e transizione di pagina. |
| `duration-slow` | 260ms | Drawer e bottom sheet. |

| Curva | Valore | Uso |
|---|---|---|
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Ingressi: parte veloce, si posa. |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Uscite: accelera e sparisce. |
| `ease-inout` | `cubic-bezier(0.4, 0, 0.2, 1)` | Movimento che inizia e finisce a schermo (collassamento sidebar). |

Il vocabolario completo (varianti Framer Motion) è in
[`src/config/motion.ts`](src/config/motion.ts).

Regole:

- le micro-interazioni restano tra 120ms e 200ms;
- hover e active cambiano **solo il colore**, mai la scala;
- il drawer anima `translateX`, la modale `opacity` + `translateY` (max 8px);
- tutto è su `transform`/`opacity`, con `.gpu` dove serve un layer dedicato;
- `prefers-reduced-motion: reduce` azzera ogni transizione in `globals.css`, e i
  componenti che animano valori (barre, colonne) usano `useReducedMotion()`.

---

## 3. Componenti

Costruiti con Radix UI (comportamento e accessibilità) + `class-variance-authority`
(varianti) + Tailwind (token). Vivono in `src/components/ui`, nello stesso stile
copy-in di shadcn/ui: il codice è nel repository, non in una dipendenza.

| File | Contenuto |
|---|---|
| `button.tsx` | `Button` (7 varianti × 5 dimensioni, loading, disabled, icona), `IconButton` (etichetta obbligatoria, taglia `touch` da 44px). |
| `input.tsx` | Superficie condivisa dei campi (`fieldSurface`), `Input` con slot `leading`/`trailing`, `Textarea` con auto-grow. |
| `field.tsx` | `Field` (etichetta + controllo + descrizione/errore con `aria-describedby`), `Label`, `FieldSet`. |
| `select.tsx` | Select Radix + `SimpleSelect` per il caso comune. |
| `combobox.tsx` | `Combobox` cercabile (cmdk + Popover) e `MultiSelect` per i filtri. |
| `checkbox.tsx` | `Checkbox`, `CheckboxField`, `RadioGroup`, `RadioCard`, `Switch`, `SwitchField`. |
| `date-input.tsx` | `DateInput`, `TimeInput`, `TimeRangeInput` (durata calcolata in tempo reale), `DateRangePresets`. |
| `badge.tsx` | `Badge`, `TicketStatusBadge`, `TicketPriorityBadge` (tacche + etichetta), `FilterChip`, `CountBadge`. |
| `avatar.tsx` | `Avatar`, `PersonChip`, `AvatarGroup`, `OrgMark`. |
| `card.tsx` | `Card` + header/body/footer, `StatTile`. |
| `table.tsx` | Primitive di tabella, `SortableHeaderCell`, `TableToolbar`, `TableSummary`. |
| `dialog.tsx` | `Modal`, `DialogContent`, `ConfirmDialog`. |
| `drawer.tsx` | Drawer laterale che diventa bottom sheet sotto 640px. |
| `menu.tsx` | Dropdown, popover, tooltip. |
| `tabs.tsx` | `Tabs` con indicatore a sottolineatura, `SegmentedControl`. |
| `meter.tsx` | `BarMeter`, `MeterRow`, `ColumnStrip`. |
| `states.tsx` | `Skeleton`, `TableSkeleton`, `EmptyState`, `ErrorState`, `SchemaMissingState`, `OfflineBanner`, `InlineEmpty`. |
| `toast.tsx` | Viewport Sonner tematizzato e `notify`, con `notify.undoable`. |
| `pagination.tsx` | Paginazione offset con conteggio. |
| `misc.tsx` | `Separator`, `Kbd`, `ScrollArea`, `SectionHeading`, `DetailRow`, `CodeBlock`. |
| `spinner.tsx` | Indicatore indeterminato. |

### 3.1 Stati obbligatori

Ogni componente interattivo implementa, dove applicabile: **normale, hover, focus
visibile, active, disabled, loading, error**. Ogni superficie dati implementa
**empty, loading, error, offline**.

Il focus è sempre lo stesso anello: 2px del colore della superficie + 2px di
`--color-focus` al 50%. Non viene mai rimosso, solo spostato con `:focus-visible`.

---

## 4. Visualizzazione dei dati

Le misure di Work-Hub sono magnitudini ordinate (ore per cliente, per categoria,
per persona). Per questo:

- **una sola tinta per serie.** Scurire la barra in funzione del valore
  raddoppierebbe la codifica della lunghezza e brucerebbe l'unico canale libero;
- **la traccia non riempita è un passo più chiaro della stessa rampa**, così lo
  stato si legge su tutta la barra;
- **barra alta 8px, estremità arrotondata 4px, base squadrata**. Una colonna non
  supera i 24px: la riga deve restare una riga di tabella;
- **il valore è sempre testo**, in inchiostro (`fg`), mai nel colore della serie,
  mai nascosto dietro un tooltip;
- **nessuna legenda per una serie singola**: il titolo dice già cosa è tracciato;
- i colori di **stato** (badge dei ticket, barra per stato) sono token di stato e
  arrivano sempre con l'etichetta, mai col solo colore.

---

## 5. Responsive

| Breakpoint | Comportamento |
|---|---|
| `< 640px` | Barra di navigazione inferiore, drawer → bottom sheet, calendario → agenda giornaliera, toolbar a capo. |
| `640–1023px` | Sidebar nascosta, tabelle con scroll orizzontale interno, form a colonna singola. |
| `≥ 1024px` | Sidebar comprimibile, navigazione delle impostazioni a colonna, griglie a due colonne. |
| `≥ 1280px` | Griglie delle stat tile a quattro colonne. |

Verificato senza overflow orizzontale a **360, 375, 414, 768, 1024 e 1280px**.

Safe area: `pt-safe` / `pb-safe` e `h-safe-bottom` in `globals.css`, più
`viewportFit: 'cover'` nel layout. La barra di navigazione mobile e i toast tengono
conto di `env(safe-area-inset-bottom)`.

Touch target minimo 44px: `IconButton size="touch"`, `min-h-touch` sulle voci di
navigazione e sulle righe dell'agenda.

---

## 6. Accessibilità

- Contrasto WCAG AA verificato dallo script, non assunto.
- Focus visibile e identico ovunque; nessun `outline: none` senza sostituto.
- Nessuna informazione affidata al solo colore: badge, barre e indicatori di
  priorità portano sempre l'etichetta (o un `sr-only` quando l'etichetta è
  ridondante per chi vede).
- Ogni controllo icon-only ha `aria-label` **obbligatorio** per tipo: `IconButton`
  non compila senza `label`.
- Modali e drawer: focus trap, `Esc`, `aria-modal`, titolo associato (via Radix).
- Tabelle: `caption` in `sr-only`, `scope="col"`, `aria-sort` sulla cella
  d'intestazione, riga apribile da tastiera tramite il titolo (non solo col click
  sulla riga).
- `aria-live="polite"` su conteggi di risultati e intervalli di date.

---

## 7. Perché non c'è il tema scuro

La direzione cromatica è definita da un canvas off-white caldo: è l'identità del
prodotto. Un tema scuro non è un'inversione dei token — richiede una seconda rampa
scelta e verificata contro la superficie scura, e raddoppia la matrice di contrasto
da mantenere. Finché non è un requisito, l'app dichiara `color-scheme: light` e
resta coerente, invece di spedire un tema scuro approssimativo.

Quando servirà: aggiungere un blocco `@media (prefers-color-scheme: dark)` che
ridefinisce le stesse custom property su `:root`, e rieseguire
`scripts/check-contrast.mjs` con le nuove superfici. Nessun componente va toccato.
