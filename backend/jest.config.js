module.exports = {
    preset: 'ts-jest', 
    testEnvironment: 'node',
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    testTimeout: 50000,
    collectCoverageFrom: [
      'controllers/*.ts',
      'errors/*.ts',
      'middleware/*.ts',
      'model/*.ts',
      'service/*.ts',
      'routes/*.ts'
    ],

    // explicitly turn on coverage collection (override any defaults)
    collectCoverage: true,
    coverageReporters: ['json', 'text', 'lcov', 'text-summary'],
    coverageDirectory: '<rootDir>/coverage',
    
    setupFiles: ['<rootDir>/jest.setup.js']
  };
  