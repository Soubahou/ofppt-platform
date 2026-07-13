/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-blue':    '#0f4c81',
        'brand-blue-hover': '#0a3a6a',
        'brand-blue-xs': 'rgba(15,76,129,0.05)',
        'brand-orange':  '#f29111',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.07)',
      },
    },
  },
  plugins: [],
}
