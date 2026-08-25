/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agilo: {
          primary: '#2563EB',
          deep: '#1D4ED8',
          navy: '#0B1F3A',
          bright: '#38BDF8',
          cyan: '#22D3EE',
          bg: '#F4F8FF',
          text: '#0F172A',
          secondary: '#64748B',
          border: '#DCE7F5',
          success: '#22A06B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        shimmer: 'shimmer 2.5s infinite',
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
