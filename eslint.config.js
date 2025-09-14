import { eslint } from '@notcodev/eslint'

export default eslint({
  type: 'lib',
  react: true,
  typescript: true,
  jsxA11y: true,
}).append({
  rules: {
    'react/no-forward-ref': 'off',
  },
})
