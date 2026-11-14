import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,ts,svelte}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      fontSize: {
        body: ['1rem', '1.6'],
        caption: ['0.8rem', '1.4'],
        card: ['1.05rem', '1.4'],
        section: ['1.6rem', '1.2'],
        page: ['2.6rem', '1.1']
      }
    }
  },
  plugins: []
} satisfies Config;
