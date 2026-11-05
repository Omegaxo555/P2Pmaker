import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F0B90B',
          hover: '#FFE043',
          dark: '#D89E00',
        },
        surface: {
          900: '#121418',
          800: '#181A20',
          700: '#1E2329',
          600: '#2B313A',
          500: '#363D47',
        },
        success: {
          DEFAULT: '#0ECB81',
          dark: '#089961',
        },
        danger: {
          DEFAULT: '#F6465D',
          dark: '#C83245',
        },
        muted: '#848E9C',
      },
    },
  },
  plugins: [],
};

export default config;
