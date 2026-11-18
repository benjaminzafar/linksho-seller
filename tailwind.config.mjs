/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['var(--font-vazirmatn)', 'Vazirmatn', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
