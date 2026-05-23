import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Pramaan brand palette — deep navy + saffron accent (subtle Indian
        // brand cue without leaning into kitsch). Saffron only as accent.
        bg:        { DEFAULT: '#0a0e1a', soft: '#11172a', card: '#141b2e' },
        border:    { DEFAULT: '#1f2942', soft: '#2a3756' },
        ink:       { DEFAULT: '#f1f5f9', mute: '#94a3b8', dim: '#64748b' },
        brand:     {
          DEFAULT: '#f59e0b',          // saffron
          50:      '#fffbeb',
          400:     '#fbbf24',
          500:     '#f59e0b',
          600:     '#d97706',
          700:     '#b45309',
        },
        accent:    '#6366f1',           // indigo — secondary
        success:   '#10b981',
        danger:    '#ef4444',
        warn:      '#f59e0b',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
        serif: ['Fraunces', 'Georgia', 'serif'],   // certificate body copy
      },
      backgroundImage: {
        'grain': "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
}
export default config
