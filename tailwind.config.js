/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#050a14',
        surface: '#0a1628',
        'surface-elevated': '#0f2040',
        border: '#1a3a6b',
        'accent-cyan': '#00d4ff',
        'accent-teal': '#00ff88',
        'accent-amber': '#ffaa00',
        'accent-red': '#ff4466',
        'accent-purple': '#aa44ff',
        'text-primary': '#e8f4fd',
        'text-secondary': '#7ba7c9',
        'text-muted': '#3d6080',
      },
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
