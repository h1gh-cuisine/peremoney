module.exports = {
  rootDir: '.',
  testRegex: '.*\\.spec\\.tsx?$',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss)$': '<rootDir>/test/style-mock.cjs',
  },
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/../server/node_modules/ts-jest', {
      tsconfig: { target: 'ES2022', module: 'commonjs', esModuleInterop: true, jsx: 'react-jsx' },
      diagnostics: false,
    }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/mock*.ts', '!src/**/types.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
};
