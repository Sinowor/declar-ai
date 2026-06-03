/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--primary-rgb) / 0.05)',
          100: 'rgb(var(--primary-rgb) / 0.1)',
          200: 'rgb(var(--primary-rgb) / 0.2)',
          300: 'rgb(var(--primary-rgb) / 0.4)',
          400: 'rgb(var(--primary-rgb) / 0.6)',
          500: 'rgb(var(--primary-rgb) / 1)',
          600: 'rgb(var(--primary-rgb) / 0.85)',
          700: 'rgb(var(--primary-rgb) / 0.7)',
          800: 'rgb(var(--primary-rgb) / 0.55)',
          900: 'rgb(var(--primary-rgb) / 0.4)',
        },
        ink: '#111827',
        muted: '#64748B',
        surface: '#F8FAFC',
      },
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.04)',
        panel: '0 12px 32px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
