/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#05030f',
          900: '#0a0720',
          850: '#100c2b',
          800: '#161137',
          700: '#211a4d',
          600: '#2e2566',
        },
      },
      boxShadow: {
        glow: '0 0 40px -8px var(--glow, rgba(168,85,247,.6))',
        card: '0 20px 50px -20px rgba(0,0,0,.8)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        aurora: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(8%, -6%) scale(1.15)' },
          '66%': { transform: 'translate(-6%, 6%) scale(.95)' },
        },
        twinkle: { '0%,100%': { opacity: '.15' }, '50%': { opacity: '1' } },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        aurora: 'aurora 22s ease-in-out infinite',
        twinkle: 'twinkle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
