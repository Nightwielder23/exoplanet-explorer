/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#000306',
        surface: '#020810',
        'surface-elevated': '#050f1e',
        border: '#0c2038',
        'accent-cyan': '#00d4ff',
        'accent-teal': '#00ff88',
        'accent-amber': '#ffaa00',
        'accent-red': '#ff4466',
        'accent-purple': '#aa44ff',
        'text-primary': '#d4ecfa',
        'text-secondary': '#6b97b8',
        'text-muted': '#284060',
      },
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
