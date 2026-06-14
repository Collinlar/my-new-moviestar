/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['dist', '_legacy', 'node_modules', '.next'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
]
