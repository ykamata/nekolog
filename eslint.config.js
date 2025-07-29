import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  // Your custom ESLint config here
  rules: {
    // Stylistic rules for code formatting
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  },
});
