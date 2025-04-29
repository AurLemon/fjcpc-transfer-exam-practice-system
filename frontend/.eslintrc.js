module.exports = {
  root: true,
  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    '@vue/prettier'
  ],
  rules: {
    'indent': ['error', 2, { 
      "ignoredNodes": ["TemplateLiteral", "JSXElement", "JSXAttribute", "Comment"] 
    }],
    'vue/html-indent': ['error', 2],
    'prettier/prettier': ['error', { 
      semi: false,
      singleQuote: true
    }]
  }
}
