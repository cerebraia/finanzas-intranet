import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Fondos / superficies (light mode) ──────────────────
        base: {
          DEFAULT: '#F4F6FA',   // fondo de página
          surface: '#FFFFFF',   // cards, paneles
          elevated: '#EEF2F8',  // inputs, superficies elevadas
          border:   '#DDE3EE',  // bordes, divisores
          hover:    '#E8EDF8',  // hover de filas y botones ghost
        },

        // ── Navy MYD3000 (sidebar, accents) ──────────────────
        navy: {
          DEFAULT: '#0F2244',   // fondo sidebar
          hover:   '#16305E',   // hover ítems sidebar
          active:  '#1A3A70',   // ítem activo sidebar
          border:  '#192E54',   // bordes internos sidebar
          50:      '#E8EEF8',   // badges/indicadores sobre navy
        },

        // ── Brand / acciones principales ─────────────────────
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1D4ED8',   // acción primaria (botones, links)
          700: '#1E40AF',   // hover botón primario
          800: '#1E3A8A',
          900: '#172A6E',
        },

        // ── Texto ─────────────────────────────────────────────
        content: {
          primary:   '#0F172A',   // headings, datos clave
          secondary: '#334155',   // texto de cuerpo, filas de tabla
          muted:     '#64748B',   // labels, captions
          disabled:  '#94A3B8',   // placeholders, deshabilitado
        },
      },

      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      borderRadius: {
        xl:  '0.5rem',   // 8px — menos redondeado que antes
        '2xl': '0.75rem', // 12px
      },

      boxShadow: {
        card:  '0 1px 3px rgba(15,34,68,0.06), 0 1px 2px rgba(15,34,68,0.04)',
        modal: '0 4px 16px rgba(15,34,68,0.10), 0 1px 4px rgba(15,34,68,0.06)',
        sm:    '0 1px 2px rgba(15,34,68,0.05)',
      },

      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
