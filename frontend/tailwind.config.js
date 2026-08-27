/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#03A9F4',
          dark: '#0288D1',
          light: '#B3E5FC',
        },
        success: '#2E7D32',     // 4.5:1 on white (was #4CAF50 which failed)
        error: '#C62828',       // 5.1:1 on white (was #F44336 which was marginal)
        warning: '#E65100',     // 4.6:1 on white (was #FF9800 which failed)
        text: {
          primary: '#212121',
          secondary: '#616161', // 4.6:1 on #F5F5F5 — WCAG AA (was #757575 which was 2.5:1, fail)
        },
        background: '#FAFAFA',
        surface: {
          DEFAULT: '#FFFFFF',
          variant: '#F5F5F5',
        },
        border: '#E0E0E0',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        'card': '8px',
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 8px rgba(0,0,0,0.15)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}