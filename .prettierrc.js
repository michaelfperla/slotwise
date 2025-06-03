/**
 * Prettier Configuration for SlotWise Platform
 *
 * This configuration ensures consistent code formatting across all
 * TypeScript/JavaScript files in the SlotWise monorepo.
 */

module.exports = {
  // ========================================================================
  // BASIC FORMATTING OPTIONS
  // ========================================================================

  // Use single quotes instead of double quotes
  singleQuote: true,

  // Add semicolons at the end of statements
  semi: true,

  // Use 2 spaces for indentation
  tabWidth: 2,

  // Use spaces instead of tabs
  useTabs: false,

  // Print width - wrap lines at 80 characters
  printWidth: 80,

  // ========================================================================
  // OBJECT AND ARRAY FORMATTING
  // ========================================================================

  // Add trailing commas in multi-line objects/arrays (ES5 compatible)
  trailingComma: 'es5',

  // Add spaces inside object braces: { foo: bar }
  bracketSpacing: true,

  // Put closing bracket on new line for multi-line arrays/objects
  bracketSameLine: false,

  // ========================================================================
  // FUNCTION AND ARROW FUNCTION FORMATTING
  // ========================================================================

  // Always include parentheses around arrow function parameters
  arrowParens: 'always',

  // ========================================================================
  // STRING FORMATTING
  // ========================================================================

  // Preserve line endings as-is
  endOfLine: 'lf',

  // ========================================================================
  // HTML/JSX SPECIFIC OPTIONS
  // ========================================================================

  // Put closing > on new line for multi-line JSX elements
  jsxBracketSameLine: false,

  // Use single quotes in JSX
  jsxSingleQuote: true,

  // ========================================================================
  // MARKDOWN SPECIFIC OPTIONS
  // ========================================================================

  // Wrap prose in markdown files
  proseWrap: 'preserve',

  // ========================================================================
  // FILE-SPECIFIC OVERRIDES
  // ========================================================================

  overrides: [
    // JSON files
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },

    // Package.json files
    {
      files: 'package.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },

    // Markdown files
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
        tabWidth: 2,
      },
    },

    // YAML files
    {
      files: ['*.yml', '*.yaml'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false,
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
        '.prettierrc.js',
      ],
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },

    // Test files - allow longer lines for readability
    {
      files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },

    // TypeScript declaration files
    {
      files: '*.d.ts',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },

    // Prisma schema files
    {
      files: 'schema.prisma',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },

    // Docker files
    {
      files: ['Dockerfile*', '*.dockerfile'],
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },

    // Shell scripts
    {
      files: ['*.sh', '*.bash'],
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
  ],
};
