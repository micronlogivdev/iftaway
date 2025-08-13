/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // New Color Palette based on design
        // Sky Blue (Primary Accent)
        'primary': {
          '50': '#EBF7FF',
          '100': '#C8E9FF',
          '200': '#A3D9FF',
          '300': '#7AC8FF',
          '400': '#52B8FF',
          '500': '#4A7BFE', // Main accent
          '600': '#2952CC',
          '700': '#1A3A99',
          '800': '#0E2166',
          '900': '#040F33',
        },
        // Base (Dark Theme)
        'base': {
          '50': '#F0F1F2',
          '100': '#D9DADE',
          '200': '#BFC4C9',
          '300': '#A4ADB5',
          '400': '#8A95A0',
          '500': '#6F7E8C',
          '600': '#5B6773',
          '700': '#47505A',
          '800': '#333942',
          '900': '#1F2229',
          '950': '#0C0C0E', // Often used for dark bg
        },
        // Old theme mapping for compatibility, now using new palette
        'light-bg': '#FFFFFF',
        'light-card': '#F7F8FA', // A very light gray
        'light-text': '#1F2229', // base-900
        'light-text-secondary': '#6F7E8C', // base-500
        'light-accent': '#4A7BFE', // primary-500
        'light-border': '#D9DADE', // base-100

        'dark-bg': '#0C0C0E', // base-950
        'dark-card': '#1F2229', // base-900
        'dark-text': '#F0F1F2', // base-50
        'dark-text-secondary': '#A4ADB5', // base-300
        'dark-accent': '#4A7BFE', // primary-500
        'dark-border': '#333942', // base-800
      }
    },
  },
  plugins: [],
}
