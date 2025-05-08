import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        article: {
          DEFAULT: 'var(--article-bg)',
          bg: 'var(--article-bg)',
        },
        bg: {
          DEFAULT: 'var(--background)',
          muted: 'var(--background-muted)',
          article: 'var(--article-bg)',
          input: 'var(--input-bg)',
        },
        fg: {
          DEFAULT: 'var(--foreground)',
          muted: 'var(--foreground-muted)',
        },
        'secondary-bg': 'var(--secondary-bg)',
        primary: {
          '50': 'var(--primary-50)',
          '100': 'var(--primary-100)',
          '200': 'var(--primary-200)',
          '300': 'var(--primary-300)',
          '400': 'var(--primary-400)',
          '500': 'var(--primary-500)',
          '600': 'var(--primary-600)',
          '700': 'var(--primary-700)',
          '800': 'var(--primary-800)',
          '900': 'var(--primary-900)',
          '950': 'var(--primary-950)',
          DEFAULT: 'hsl(22 56% 52%)'
        },
        secondary: 'var(--secondary)',
        accent: {
          bg: 'hsl(var(--accent-bg-hsl) / <alpha-value>)',
          fg: 'var(--accent-fg)',
          bgHover: 'var(--accent-bg-hover)',
          bgHoverDark: 'var(--accent-bg-hover-dark)',
        },
      },
      fontFamily: {
        source: ['IBM Plex Sans', 'Inter', 'Source Sans 3', 'sans-serif'],
        plex: ['IBM Plex Sans', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config 