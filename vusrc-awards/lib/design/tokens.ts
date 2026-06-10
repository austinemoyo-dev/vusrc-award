// Design tokens — single source of truth for programmatic style usage.
// Tailwind CSS class names should still be preferred for static styles.
// Use these for: dynamic inline styles, canvas drawing, chart colors, SVG fills.

export const colors = {
  base:       '#080808',
  surface:    '#111111',
  surface2:   '#1a1a1a',
  border:     '#2a2a2a',
  gold:       '#C9A84C',
  goldLight:  '#E8C96D',
  goldMuted:  '#8B6914',
  foreground: '#F5F5F5',
  muted:      '#888888',
  success:    '#4CAF50',
  error:      '#ef4444',
  warning:    '#f59e0b',
} as const

export const fonts = {
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  sans:  'Inter, system-ui, -apple-system, sans-serif',
  mono:  '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
} as const

export const radii = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '18px',
  full: '9999px',
} as const

export const shadows = {
  goldSm: '0 0 12px rgba(201,168,76,0.25)',
  goldMd: '0 0 28px rgba(201,168,76,0.35)',
  goldLg: '0 0 60px rgba(201,168,76,0.4)',
  card:   '0 4px 24px rgba(0,0,0,0.6)',
} as const

// Chart color gradient (used by recharts, display leaderboard, etc.)
export const chartColors = [
  colors.gold,
  colors.goldLight,
  colors.goldMuted,
  '#4a3310',
  '#2a2a2a',
] as const
