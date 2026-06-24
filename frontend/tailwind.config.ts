import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1152px' } },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        border: 'var(--border)',
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        gold: { DEFAULT: 'var(--gold)', deep: 'var(--gold-deep)', soft: 'var(--gold-soft)' },
        ink: 'var(--ink)',
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 4px)', sm: 'calc(var(--radius) - 8px)' },
      fontFamily: { sans: ['var(--font-tajawal)', 'system-ui', 'sans-serif'] },
      boxShadow: { luxe: 'var(--shadow-luxe)' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(-100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.6s var(--ease-luxe) both',
        'fade-in': 'fade-in 0.4s ease both',
      },
    },
  },
  plugins: [animate],
};

export default config;
