#!/usr/bin/env node
/**
 * WCAG contrast audit for the Work-Hub palette.
 *
 *   node scripts/check-contrast.mjs
 *
 * Reads the hex values straight out of `src/config/tokens.ts` (no TS runtime
 * needed — the file is a flat object literal) and checks every pair the UI
 * actually renders. Exits non-zero if a pair falls below its target, so the
 * "WCAG AA" claim in DESIGN_SYSTEM.md is verified rather than asserted.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'src/config/tokens.ts'), 'utf8')

const colorBlock = source.slice(
  source.indexOf('export const color = {'),
  source.indexOf('} satisfies TokenGroup'),
)

const color = {}
for (const match of colorBlock.matchAll(/^\s*'?([a-z0-9-]+)'?:\s*'(#[0-9A-Fa-f]{6})'/gm)) {
  color[match[1]] = match[2]
}

function channel(value) {
  const srgb = value / 255
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const int = Number.parseInt(hex.slice(1), 16)
  const r = channel((int >> 16) & 255)
  const g = channel((int >> 8) & 255)
  const b = channel(int & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** [foreground, background, minimum ratio, label] */
const PAIRS = [
  ['fg', 'canvas', 4.5, 'testo principale su canvas'],
  ['fg', 'surface', 4.5, 'testo principale su surface'],
  ['fg', 'surface-sunken', 4.5, 'testo principale su surface-sunken'],
  ['fg-secondary', 'canvas', 4.5, 'testo secondario su canvas'],
  ['fg-secondary', 'surface', 4.5, 'testo secondario su surface'],
  ['fg-muted', 'canvas', 4.5, 'metadati su canvas'],
  ['fg-muted', 'surface', 4.5, 'metadati su surface'],
  ['fg-muted', 'surface-muted', 4.5, 'metadati su surface-muted'],
  ['fg-disabled', 'surface', 3, 'placeholder e testo disabilitato su surface'],
  ['fg-disabled', 'canvas', 3, 'placeholder e testo disabilitato su canvas'],
  ['brand-contrast', 'brand', 4.5, 'etichetta su pulsante primario'],
  ['brand-contrast', 'brand-hover', 4.5, 'etichetta su primario hover'],
  ['brand-contrast', 'brand-active', 4.5, 'etichetta su primario active'],
  ['brand-text', 'brand-subtle', 4.5, 'badge brand'],
  ['brand-text', 'surface', 4.5, 'link brand su surface'],
  ['success-text', 'success-subtle', 4.5, 'badge successo'],
  ['warning-text', 'warning-subtle', 4.5, 'badge attenzione'],
  ['danger-text', 'danger-subtle', 4.5, 'badge errore'],
  ['info-text', 'info-subtle', 4.5, 'badge informazione'],
  ['neutral-text', 'neutral-subtle', 4.5, 'badge neutro'],
  ['fg-inverse', 'danger', 4.5, 'etichetta su pulsante distruttivo'],
  ['fg-inverse', 'fg', 4.5, 'tooltip'],
  ['danger-text', 'surface', 4.5, 'errore di campo su surface'],
  ['warning-text', 'surface', 4.5, 'avviso su surface'],
  ['success-text', 'surface', 4.5, 'conferma su surface'],
  ['brand', 'surface', 3, 'icona/accento brand (grafica)'],
  ['line-strong', 'surface', 1.5, 'bordo forte su surface (decorativo)'],
]

let failures = 0
const rows = []

for (const [fg, bg, minimum, label] of PAIRS) {
  if (!color[fg] || !color[bg]) {
    console.error(`? token mancante: ${fg} / ${bg}`)
    failures += 1
    continue
  }
  const ratio = contrast(color[fg], color[bg])
  const pass = ratio >= minimum
  if (!pass) failures += 1
  rows.push({
    coppia: `${fg} / ${bg}`,
    rapporto: `${ratio.toFixed(2)}:1`,
    minimo: `${minimum}:1`,
    esito: pass ? 'OK' : 'FAIL',
    uso: label,
  })
}

const width = Math.max(...rows.map((row) => row.coppia.length))
for (const row of rows) {
  const flag = row.esito === 'OK' ? '✓' : '✗'
  console.log(
    `${flag} ${row.coppia.padEnd(width)}  ${row.rapporto.padStart(7)}  (min ${row.minimo.padStart(6)})  ${row.uso}`,
  )
}

console.log(
  failures === 0
    ? `\nTutte le ${rows.length} coppie rispettano il minimo richiesto.`
    : `\n${failures} coppie sotto il minimo.`,
)
process.exit(failures === 0 ? 0 : 1)
