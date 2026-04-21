import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#173249',
        mist: '#ecf6f7',
        tide: '#0f8b8d',
        moss: '#2d6a4f',
        ember: '#c44536',
        dusk: '#345c72',
        sand: '#f3ede2',
      },
      boxShadow: {
        panel: '0 18px 50px rgba(23, 50, 73, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
