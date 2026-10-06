/**
 * Work-Hub design tokens — single source of truth.
 *
 * `tailwind.config.ts` reads this file twice: once to build the Tailwind theme,
 * and once (through a small plugin) to emit every value as a CSS custom
 * property on `:root`. One source, no generated file to keep in sync.
 *
 * Rules:
 *  - never hardcode a colour, radius, duration or shadow in a component when a
 *    token exists; use the Tailwind utility that maps to the token;
 *  - colours are named by *role*, never by hue (`--color-danger`, not `--color-red`);
 *  - colour tokens are emitted as RGB channels so Tailwind alpha modifiers
 *    (`bg-brand/10`) keep working.
 */

export type TokenGroup = Record<string, string>

/** Surfaces, text, borders and semantic status colours. */
export const color = {
  /* Canvas — the application background. Warm off-white, never optical white. */
  canvas: '#F6F6F3',
  'canvas-sunken': '#EEEEE9',

  /* Surfaces — content containers that sit on the canvas. */
  surface: '#FFFFFF',
  'surface-muted': '#FBFBF9',
  'surface-sunken': '#F2F2EE',
  'surface-hover': '#F5F5F1',
  'surface-active': '#EDEDE7',
  'surface-selected': '#ECF2F0',

  /* Lines. Thin and quiet; they replace shadows for grouping. */
  'line-subtle': '#EAE9E3',
  line: '#DCDBD3',
  'line-strong': '#BEBDB1',

  /* Foreground (text). Soft anthracite, never absolute black. */
  fg: '#1C1C1A',
  'fg-secondary': '#51514A',
  'fg-muted': '#696960',
  'fg-disabled': '#8F8F85',
  'fg-inverse': '#F7F7F4',

  /* Brand — petrol / forest green. Primary actions and selection. */
  brand: '#1E4C44',
  'brand-hover': '#18403A',
  'brand-active': '#12332F',
  'brand-contrast': '#FFFFFF',
  'brand-subtle': '#E7EFEC',
  'brand-subtle-hover': '#DCE8E4',
  'brand-line': '#BFD4CE',
  'brand-text': '#17403A',

  /* Status — each one ships a solid, a subtle fill, a line and a text tone. */
  success: '#3A7049',
  'success-subtle': '#E8F1EA',
  'success-line': '#C2D8C8',
  'success-text': '#2C5939',

  warning: '#8E5520',
  'warning-subtle': '#F7EEE3',
  'warning-line': '#E3CEB5',
  'warning-text': '#73451A',

  danger: '#982F21',
  'danger-subtle': '#F8EAE7',
  'danger-line': '#E7C6BF',
  'danger-text': '#7E2619',

  info: '#2B4C7E',
  'info-subtle': '#E8EDF5',
  'info-line': '#C3D1E5',
  'info-text': '#223C65',

  neutral: '#6B6B61',
  'neutral-subtle': '#F0F0EB',
  'neutral-line': '#D8D7CF',
  'neutral-text': '#51514A',

  /* Interaction */
  focus: '#1E4C44',
  overlay: '#1C1C1A',
} satisfies TokenGroup

/** 4px base scale. Consumed through Tailwind spacing utilities. */
export const space = {
  '0': '0px',
  px: '1px',
  /* Sub-grid steps, used only for optical nudges and icon boxes. */
  '0.5': '2px',
  '1.5': '6px',
  '2.5': '10px',
  '3.5': '14px',
  /* 4px grid. */
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '11': '44px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '18': '72px',
  '20': '80px',
  '24': '96px',
  '32': '128px',
} satisfies TokenGroup

/** Restrained radii. 16px is reserved for large overlays only. */
export const radius = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} satisfies TokenGroup

/**
 * Shadows exist to signal that a surface floats above the page: popovers,
 * menus, drawers, modals, toasts. Cards and table rows never use them.
 */
export const shadow = {
  none: 'none',
  popover: '0 1px 2px rgb(28 28 26 / 0.04), 0 8px 20px -10px rgb(28 28 26 / 0.14)',
  overlay: '0 2px 4px rgb(28 28 26 / 0.04), 0 24px 48px -24px rgb(28 28 26 / 0.22)',
  drawer: '-10px 0 36px -18px rgb(28 28 26 / 0.18)',
  toast: '0 1px 2px rgb(28 28 26 / 0.05), 0 12px 28px -14px rgb(28 28 26 / 0.18)',
} satisfies TokenGroup

export const fontFamily = {
  sans: "var(--font-plus-jakarta), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
} satisfies TokenGroup

/**
 * Typographic scale. Every role is explicit so pages never invent sizes.
 * Shape: `[size, { lineHeight, letterSpacing, fontWeight }]`.
 */
export const fontSize = {
  display: ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em', fontWeight: '600' }],
  'page-title': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.016em', fontWeight: '600' }],
  'section-title': ['1rem', { lineHeight: '1.375rem', letterSpacing: '-0.008em', fontWeight: '600' }],
  'subsection-title': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.004em', fontWeight: '600' }],
  'table-heading': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em', fontWeight: '600' }],
  body: ['0.875rem', { lineHeight: '1.3125rem', letterSpacing: '0em', fontWeight: '400' }],
  'body-sm': ['0.8125rem', { lineHeight: '1.1875rem', letterSpacing: '0em', fontWeight: '400' }],
  meta: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.004em', fontWeight: '400' }],
  label: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em', fontWeight: '500' }],
  caption: ['0.6875rem', { lineHeight: '0.9375rem', letterSpacing: '0.012em', fontWeight: '400' }],
  metric: ['1.5rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em', fontWeight: '600' }],
} satisfies Record<
  string,
  [string, { lineHeight: string; letterSpacing: string; fontWeight: string }]
>

/** Motion. Micro-interactions stay between 120ms and 200ms. */
export const duration = {
  instant: '80ms',
  fast: '140ms',
  standard: '180ms',
  moderate: '220ms',
  slow: '260ms',
} satisfies TokenGroup

export const easing = {
  /** Entrances and anything the user is waiting for. */
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Exits — leaves quickly, no overshoot. */
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Movement that starts and ends on screen. */
  inout: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
} satisfies TokenGroup

export const zIndex = {
  base: '0',
  raised: '10',
  sticky: '20',
  header: '30',
  dropdown: '40',
  drawer: '50',
  modal: '60',
  popover: '70',
  toast: '80',
  command: '90',
} satisfies TokenGroup

/** Layout constants used by the app shell. */
export const layout = {
  'sidebar-width': '248px',
  'sidebar-width-collapsed': '60px',
  'topbar-height': '56px',
  'mobile-nav-height': '56px',
  'content-max': '1680px',
  'drawer-width': '580px',
  'row-height': '44px',
  'row-height-compact': '36px',
  'touch-target': '44px',
} satisfies TokenGroup

export const tokens = {
  color,
  space,
  radius,
  shadow,
  fontFamily,
  fontSize,
  duration,
  easing,
  zIndex,
  layout,
}

export type Tokens = typeof tokens
