import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/** eslint-config-next 16 ships native flat configs — no FlatCompat needed. */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'assets/**'],
  },
]

export default eslintConfig
