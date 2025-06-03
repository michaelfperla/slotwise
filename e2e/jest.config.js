module.exports = {
  displayName: 'e2e-tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.e2e.ts', '**/?(*.)+(e2e).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 60000,
  // E2E tests should run sequentially
  maxWorkers: 1,
  // Global setup and teardown for services
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  passWithNoTests: true,
};
