module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
  ],
  coverageThreshold: {
    global: { lines: 40, functions: 35 }
  },
  // Éviter les conflits de port entre tests
  maxWorkers: 1,
  // Fermer les connexions après chaque suite
  forceExit: true,
};
