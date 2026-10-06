import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import {
  color,
  duration,
  easing,
  fontFamily,
  fontSize,
  layout,
  radius,
  shadow,
  space,
  zIndex,
} from './src/config/tokens'

/** `#1E4C44` -> `30 76 68` so Tailwind alpha modifiers keep working. */
function channels(hex: string): string {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value
  const int = Number.parseInt(full, 16)
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`
}

type ColorToken = keyof typeof color

/** Reference a colour token through its CSS variable. */
const c = (token: ColorToken) => `rgb(var(--color-${token}) / <alpha-value>)`

/**
 * Emits every token as a CSS custom property on `:root`, from the same objects
 * Tailwind reads. One source of truth, no generated file to keep in sync.
 */
const tokensPlugin = plugin(({ addBase }) => {
  const vars: Record<string, string> = {}
  for (const [key, value] of Object.entries(color)) vars[`--color-${key}`] = channels(value)
  for (const [key, value] of Object.entries(radius)) vars[`--radius-${key}`] = value
  for (const [key, value] of Object.entries(shadow)) vars[`--shadow-${key}`] = value
  for (const [key, value] of Object.entries(duration)) vars[`--duration-${key}`] = value
  for (const [key, value] of Object.entries(easing)) vars[`--ease-${key}`] = value
  for (const [key, value] of Object.entries(zIndex)) vars[`--z-${key}`] = value
  for (const [key, value] of Object.entries(layout)) vars[`--${key}`] = value
  for (const [key, value] of Object.entries(space)) vars[`--space-${key}`] = value
  vars['--font-sans'] = fontFamily.sans
  addBase({ ':root': vars })
})

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  future: { hoverOnlyWhenSupported: true },
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    spacing: space,
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      canvas: { DEFAULT: c('canvas'), sunken: c('canvas-sunken') },
      surface: {
        DEFAULT: c('surface'),
        muted: c('surface-muted'),
        sunken: c('surface-sunken'),
        hover: c('surface-hover'),
        active: c('surface-active'),
        selected: c('surface-selected'),
      },
      line: { DEFAULT: c('line'), subtle: c('line-subtle'), strong: c('line-strong') },
      fg: {
        DEFAULT: c('fg'),
        secondary: c('fg-secondary'),
        muted: c('fg-muted'),
        disabled: c('fg-disabled'),
        inverse: c('fg-inverse'),
      },
      brand: {
        DEFAULT: c('brand'),
        hover: c('brand-hover'),
        active: c('brand-active'),
        contrast: c('brand-contrast'),
        subtle: c('brand-subtle'),
        'subtle-hover': c('brand-subtle-hover'),
        line: c('brand-line'),
        text: c('brand-text'),
      },
      success: {
        DEFAULT: c('success'),
        subtle: c('success-subtle'),
        line: c('success-line'),
        text: c('success-text'),
      },
      warning: {
        DEFAULT: c('warning'),
        subtle: c('warning-subtle'),
        line: c('warning-line'),
        text: c('warning-text'),
      },
      danger: {
        DEFAULT: c('danger'),
        subtle: c('danger-subtle'),
        line: c('danger-line'),
        text: c('danger-text'),
      },
      info: {
        DEFAULT: c('info'),
        subtle: c('info-subtle'),
        line: c('info-line'),
        text: c('info-text'),
      },
      neutral: {
        DEFAULT: c('neutral'),
        subtle: c('neutral-subtle'),
        line: c('neutral-line'),
        text: c('neutral-text'),
      },
      focus: c('focus'),
      overlay: c('overlay'),
    },
    borderRadius: radius,
    boxShadow: shadow,
    fontFamily: { sans: fontFamily.sans.split(', '), mono: fontFamily.mono.split(', ') },
    fontSize,
    transitionDuration: Object.fromEntries(
      Object.entries(duration).map(([key, value]) => [key, value]),
    ),
    transitionTimingFunction: easing,
    zIndex,
    extend: {
      maxWidth: { content: layout['content-max'], drawer: layout['drawer-width'] },
      height: {
        topbar: layout['topbar-height'],
        row: layout['row-height'],
        'row-compact': layout['row-height-compact'],
        'mobile-nav': layout['mobile-nav-height'],
      },
      minHeight: { touch: layout['touch-target'] },
      minWidth: { touch: layout['touch-target'] },
      width: {
        sidebar: layout['sidebar-width'],
        'sidebar-collapsed': layout['sidebar-width-collapsed'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in-right': {
          from: { transform: 'translate3d(100%, 0, 0)' },
          to: { transform: 'translate3d(0, 0, 0)' },
        },
        'slide-out-right': {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(100%, 0, 0)' },
        },
        'overlay-in': {
          from: { opacity: '0', transform: 'translate3d(0, 8px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'overlay-out': {
          from: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
          to: { opacity: '0', transform: 'translate3d(0, 4px, 0)' },
        },
        'popover-in': {
          from: { opacity: '0', transform: 'translate3d(0, -4px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in': `fade-in ${duration.standard} ${easing.standard}`,
        'fade-out': `fade-out ${duration.fast} ${easing.exit}`,
        'slide-in-right': `slide-in-right ${duration.slow} ${easing.standard}`,
        'slide-out-right': `slide-out-right ${duration.moderate} ${easing.exit}`,
        'overlay-in': `overlay-in ${duration.moderate} ${easing.standard}`,
        'overlay-out': `overlay-out ${duration.fast} ${easing.exit}`,
        'popover-in': `popover-in ${duration.fast} ${easing.standard}`,
        spin: `spin 0.8s ${easing.linear} infinite`,
      },
    },
  },
  plugins: [tokensPlugin],
}

export default config
