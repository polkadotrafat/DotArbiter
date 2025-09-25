// frontend/jest.config.js

/** @type {import('ts-jest').JestConfigWithTsJest} */
// This uses modern ES Module `export default` syntax
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // This section is crucial for telling Jest how to handle different file types
  transform: {
    // Use ts-jest for .ts and .tsx files
    '^.+\\.tsx?$': ['ts-jest', {
      // ts-jest configuration options go here
      tsconfig: 'tsconfig.json',
    }],
  },

  // This helps Jest find your modules when you use absolute paths
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};