export default {
  displayName: 'business-service-integration',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.integration.ts',
    '**/?(*.)+(integration).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/integration-setup.ts'],
  testTimeout: 30000,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Don't run integration tests in parallel to avoid database conflicts
  maxWorkers: 1,
  // Integration tests require real services
  passWithNoTests: true
};
