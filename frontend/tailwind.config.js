/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          bg: '#090D1A',
          card: 'rgba(17, 25, 46, 0.75)',
          border: 'rgba(99, 102, 241, 0.15)',
          indigo: '#6366F1',
          cyan: '#06B6D4',
          purple: '#A855F7',
          green: '#10B981',
          red: '#EF4444',
          grayText: '#94A3B8'
        }
      },
      boxShadow: {
        'neon-indigo': '0 0 15px rgba(99, 102, 241, 0.3)',
        'neon-cyan': '0 0 15px rgba(6, 118, 212, 0.3)',
        'neon-purple': '0 0 15px rgba(168, 85, 247, 0.3)',
      }
    },
  },
  plugins: [],
}
