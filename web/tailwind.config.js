/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify: {
          base: '#121212',
          surface: '#181818',
          card: '#222222',
          'card-hover': '#2a2a2a',
          elevated: '#242424',
          subtext: '#b3b3b3',
          border: '#2e2e2e',
          green: '#1db954',
          'green-light': '#1ed760',
          'green-dark': '#1aa34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif', 'system-ui'],
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
      },
    },
  },
  plugins: [],
};
