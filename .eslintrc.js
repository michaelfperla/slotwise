/**
 * ESLint Configuration for SlotWise Platform
 *
 * This configuration enforces coding standards across all TypeScript/JavaScript
 * services and applications in the SlotWise monorepo.
 */

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json', './services/*/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // ========================================================================
    // GENERAL CODE QUALITY RULES
    // ========================================================================

    // Enforce consistent naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      // Variables and functions: camelCase
      {
        selector: 'variableLike',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      // Functions: camelCase with descriptive verbs
      {
        selector: 'function',
        format: ['camelCase'],
      },
      // Classes: PascalCase
      {
        selector: 'class',
        format: ['PascalCase'],
      },
      // Interfaces: PascalCase
      {
        selector: 'interface',
        format: ['PascalCase'],
      },
      // Types: PascalCase
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      // Enums: PascalCase
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
      // Enum members: SCREAMING_SNAKE_CASE
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
      // Constants: SCREAMING_SNAKE_CASE
      {
        selector: 'variable',
        modifiers: ['const', 'global'],
        format: ['UPPER_CASE', 'camelCase'],
      },
      // Object properties: allow any format (for external APIs)
      {
        selector: 'objectLiteralProperty',
        format: null,
      },
    ],

    // Enforce explicit return types for functions
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],

    // Require explicit accessibility modifiers
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        accessibility: 'explicit',
        overrides: {
          constructors: 'no-public',
        },
      },
    ],

    // Prefer readonly for arrays and objects that don't change
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for most cases

    // Enforce consistent array types
    '@typescript-eslint/array-type': ['error', { default: 'array' }],

    // Prefer interface over type alias where possible
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

    // Enforce consistent type imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],

    // ========================================================================
    // ERROR PREVENTION RULES
    // ========================================================================

    // Prevent unused variables (with exceptions for function parameters)
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // Prevent floating promises
    '@typescript-eslint/no-floating-promises': 'error',

    // Prevent misused promises
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
      },
    ],

    // Require proper error handling
    '@typescript-eslint/no-throw-literal': 'error',
    '@typescript-eslint/prefer-promise-reject-errors': 'error',

    // Prevent dangerous any usage
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',

    // ========================================================================
    // CODE STYLE RULES
    // ========================================================================

    // Enforce consistent spacing
    '@typescript-eslint/object-curly-spacing': ['error', 'always'],
    '@typescript-eslint/space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],

    // Enforce semicolons
    '@typescript-eslint/semi': ['error', 'always'],

    // Enforce consistent quotes
    '@typescript-eslint/quotes': ['error', 'single', { avoidEscape: true }],

    // Enforce trailing commas
    '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],

    // ========================================================================
    // IMPORT/EXPORT RULES
    // ========================================================================

    // Enforce import order
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // Prevent duplicate imports
    'import/no-duplicates': 'error',

    // Enforce file extensions for imports
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
        tsx: 'never',
        js: 'never',
        jsx: 'never',
      },
    ],

    // ========================================================================
    // SECURITY RULES
    // ========================================================================

    // Prevent console.log in production
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

    // Prevent debugger statements
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

    // Prevent eval usage
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // ========================================================================
    // PERFORMANCE RULES
    // ========================================================================

    // Prefer const over let where possible
    'prefer-const': 'error',

    // Prefer template literals over string concatenation
    'prefer-template': 'error',

    // Prefer destructuring
    'prefer-destructuring': [
      'error',
      {
        array: false,
        object: true,
      },
    ],
  },

  // ========================================================================
  // ENVIRONMENT-SPECIFIC OVERRIDES
  // ========================================================================

  overrides: [
    // Test files
    {
      files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
      env: {
        jest: true,
      },
      rules: {
        // Allow any in test files for mocking
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',

        // Allow non-null assertions in tests
        '@typescript-eslint/no-non-null-assertion': 'off',

        // Allow empty functions in tests (for mocks)
        '@typescript-eslint/no-empty-function': 'off',
      },
    },

    // Configuration files
    {
      files: [
        '*.config.js',
        '*.config.ts',
        'jest.config.*',
        'webpack.config.*',
        'next.config.*',
        '.eslintrc.js',
      ],
      rules: {
        // Allow require in config files
        '@typescript-eslint/no-var-requires': 'off',

        // Allow any in config files
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },

    // Go service files (if any TypeScript config files exist)
    {
      files: ['services/auth-service/**/*', 'services/scheduling-service/**/*'],
      rules: {
        // Disable TypeScript rules for Go services
        '@typescript-eslint/no-var-requires': 'off',
      },
    },

    // Frontend specific rules
    {
      files: ['frontend/**/*'],
      env: {
        browser: true,
      },
      extends: ['next/core-web-vitals'],
      rules: {
        // React specific rules
        'react-hooks/exhaustive-deps': 'warn',
        'react/prop-types': 'off', // Using TypeScript for prop validation
      },
    },
  ],

  // ========================================================================
  // SETTINGS
  // ========================================================================

  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './services/*/tsconfig.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },

  // Ignore patterns
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'coverage/',
    '*.min.js',
    'prisma/migrations/',
  ],
};
