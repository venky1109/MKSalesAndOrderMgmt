/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
  extend: {
  animation: {
    blinkRed: 'blinkRed 3s step-end infinite',
    blinkYellow: 'blinkYellow 3s step-end infinite',
  },
  keyframes: {
    blinkRed: {
      '0%, 100%': { backgroundColor: 'transparent' },
      '50%': { backgroundColor: '#fee2e2' }, // red-200
    },
    blinkYellow: {
      '0%, 100%': { backgroundColor: 'transparent' },
      '50%': { backgroundColor: '#fef9c3' }, // yellow-300
    },
  },
},

  },
  plugins: [],
}

