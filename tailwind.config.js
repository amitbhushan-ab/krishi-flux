/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        soil: {
          50: '#faf7f2',
          100: '#f2ebe0',
          200: '#e4d6c1',
          300: '#d0b795',
          400: '#b8956a',
          500: '#a37a4c',
          600: '#8a6440',
          700: '#6b4f39',
          800: '#4f3b2b',
          900: '#1c1815',
        },
        leaf: {
          50: '#f1faf3',
          100: '#dff3e4',
          200: '#bfe7cb',
          300: '#8ed3a5',
          400: '#57b87b',
          500: '#339c5c',
          600: '#237d48',
          700: '#1d633c',
          800: '#1a4f32',
          900: '#16412b',
        },
        sky: {
          50: '#f1f8fd',
          100: '#e0f0fa',
          200: '#bfe1f5',
          300: '#8cc9ec',
          400: '#52aade',
          500: '#2b8bc7',
        },
        solar: {
          400: '#f5b544',
          500: '#ef9f16',
          600: '#d47f0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
};
