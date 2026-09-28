import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        /* Cinema design system */
        cinema: {
          black:   '#0B0A09',
          dark:    '#111111',
          surface: '#151310',
          border:  '#252525',
          'border-subtle': '#1E1E1E',
        },
        film: {
          gold:         '#C8963E',
          amber:        '#E8A530',
          'amber-light': '#E8C27A',
          red:          '#D43F3F',
          cream:        '#EDE4D2',
          'cream-light': '#D8D2C4',
          muted:        '#8C8C8C',
          subtle:       '#5A5A5A',
          burgundy:     '#3A1520',
          navy:         '#0F2230',
          teal:         '#12242B',
          bark:         '#2C1A0E',
          terra:        '#B5532F',
        },
        /* shadcn compatibility layer */
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          '"Geist"', '-apple-system', 'BlinkMacSystemFont',
          '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif',
        ],
        serif: ['"Georgia"', '"Times New Roman"', 'serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.4s ease-out',
        'slide-in':       'slide-in 0.3s ease-out',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C8963E 0%, #E8A530 100%)',
        'cinema-gradient': 'linear-gradient(180deg, transparent 0%, #0B0A09 100%)',
        'poster-overlay': 'linear-gradient(to top, rgba(11,10,9,0.97) 0%, rgba(11,10,9,0.55) 50%, rgba(11,10,9,0.15) 100%)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;
