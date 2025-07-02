module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/tests/**/*.spec.js'
    ],
    collectCoverageFrom: [
        'src/vanilla/**/*.js',
        '!src/vanilla/**/*.test.js',
        '!src/vanilla/**/*.spec.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['html', 'text', 'lcov'],
    verbose: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    testTimeout: 10000,
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
}; 