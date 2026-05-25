import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      // This repo intentionally uses client-mount guards and effect-driven loaders.
      // These rules are too strict for the current codebase and break CI.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',

      // Allow gradual typing cleanup instead of blocking CI.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
])

export default eslintConfig
