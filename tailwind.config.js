/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        neon: '0 0 30px rgba(56, 189, 248, 0.35)',
        redneon: '0 0 30px rgba(248, 113, 113, 0.35)'
      }
    }
  },
  plugins: []
};
