/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          bg:          '#1e1e1e',
          sidebar:     '#252526',
          panel:       '#1e1e1e',
          border:      '#3c3c3c',
          accent:      '#007acc',
          'accent-hover': '#1a8ad4',
          text:        '#cccccc',
          'text-muted':'#858585',
          tab:         '#2d2d2d',
          'tab-active':'#1e1e1e',
          hover:       '#2a2d2e',
          select:      '#094771',
          statusbar:   '#007acc',
          activitybar: '#333333'
        }
      },
      fontFamily: {
        mono: ['Consolas', 'Menlo', 'Monaco', '"Courier New"', 'monospace']
      }
    }
  },
  plugins: []
}
