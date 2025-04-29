module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    '@vue/eslint-config-prettier'
  ],
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    indent: ['error', 2, {
      ignoredNodes: ['TemplateLiteral', 'JSXElement', 'JSXAttribute', 'Comment']
    }],
    'vue/html-indent': ['error', 2],
    'prettier/prettier': ['error', {
      semi: false,
      singleQuote: true
    }]
  }
}
