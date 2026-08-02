/* postcss.config.mjs
 *
 * This project uses plain CSS (globals.css with CSS custom properties).
 * No Tailwind @layer / @apply directives are used in any .css file,
 * so we run PostCSS with zero plugins to avoid unnecessary transforms.
 *
 * If you add Tailwind directives later:
 *   1. Uncomment the plugin below.
 *   2. Add @tailwind base/components/utilities to globals.css.
 */

const config = {
  plugins: {
    // "@tailwindcss/postcss": {},   ← uncomment if you add @tailwind directives
  },
};

export default config;
