module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',      // libera o uso de any
    '@typescript-eslint/no-unused-vars': 'warn',     // variáveis não usadas viram warnings
    'prefer-const': 'warn',                          // let onde pode const vira warning
    'react/no-unescaped-entities': 'off'             // para evitar erros com aspas no JSX
  }
}
