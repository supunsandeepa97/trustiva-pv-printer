import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          500: '#1e3a5f',
          900: '#0F172A',
          950: '#080e1a',
        },
        gold: {
          50:  '#FFFDF0',
          100: '#FEF9CC',
          200: '#FCF0A0',
          300: '#F8E26A',
          400: '#F0CE35',
          500: '#DDB820',
          600: '#C9A227',
          700: '#A07D1A',
          800: '#765C12',
          900: '#4C3C0A',
          950: '#2A2006',
        },
        royal: {
          50:  '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563EB',
          700: '#1d4ed8',
        },
        emerald: {
          400: '#34d399',
          500: '#10B981',
          600: '#059669',
        },
        slate: {
          100: '#F1F5F9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          500: '#64748b',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass:  '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        card:   '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
        soft:   '0 4px 24px rgba(0,0,0,0.08)',
        gold:   '0 4px 20px rgba(201,162,39,0.35)',
      },
      borderRadius: {
        xl:    '12px',
        '2xl': '16px',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'shimmer':    'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
