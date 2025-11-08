# Scripts

This directory contains various utility scripts for the Nuxt 3 TypeScript project, including build validation, testing, and database management.

## build-validate.js

The `build-validate.js` script performs a comprehensive validation of the build process, ensuring that:

1. **ESLint Validation**: Runs ESLint with auto-fix to ensure code quality and consistent formatting
2. **TypeScript Type Checking**: Verifies that all TypeScript code is type-safe
3. **Production Build**: Generates an optimized production build

### Usage

```bash
# Run the build validation script
npm run build:validate
```

### Configuration

The build validation process is configured to:

- Run ESLint with auto-fix to automatically fix formatting issues
- Perform TypeScript type checking during the build process
- Generate a production-ready build

### Error Handling

The script will fail if:

- TypeScript type checking fails
- The production build fails

### Integration with CI/CD

This script is designed to be used in CI/CD pipelines to ensure that code quality and type safety are maintained before deployment.

## Adding Custom Validation Steps

To add custom validation steps to the build process, modify the `build-validate.js` script and add additional commands as needed.

## vitest-agent.ts

The `vitest-agent.ts` script is a comprehensive test management tool for running, analyzing, and reporting Vitest tests.

### Features

- **Test Category Execution**: Run tests by category (api, components, composables, auth, accessibility, performance)
- **Detailed Test Analysis**: Get comprehensive reports on test results
- **Failed Test Retry**: Automatically retry failed tests
- **Coverage Reporting**: Generate test coverage reports
- **Interactive Mode**: Watch mode for continuous testing
- **Verbose Output**: Detailed test execution information

### Usage

```bash
# Run all tests
npm run test:agent

# Run tests by category
npm run test:agent components
npm run test:agent api
npm run test:agent auth

# Run with options
npm run test:agent -- --watch         # Watch mode
npm run test:agent -- --coverage      # With coverage
npm run test:agent -- --verbose       # Verbose output
npm run test:agent -- --retry         # Retry failed tests

# Combine category and options
npm run test:agent components -- --verbose
```

### Available Categories

- **api**: API endpoint tests
- **components**: Vue component tests
- **composables**: Composable function tests
- **auth**: Authentication tests
- **accessibility**: Accessibility tests
- **performance**: Performance benchmark tests

### Options

- `--watch` or `-w`: Run tests in watch mode
- `--coverage` or `-c`: Generate coverage report
- `--verbose` or `-v`: Show detailed test output
- `--retry` or `-r`: Retry failed tests
- `--help` or `-h`: Show help message

### Convenience Scripts

The following npm scripts are available for common use cases:

- `npm run test:agent`: Run all tests
- `npm run test:agent:watch`: Run all tests in watch mode
- `npm run test:agent:coverage`: Run all tests with coverage
- `npm run test:agent:verbose`: Run all tests with verbose output

### Test Summary Output

The agent provides a detailed summary including:

- Number of test files per category
- Pass/fail status for each category
- Test duration for each category
- Total test statistics
- Overall execution time

### Integration with CI/CD

This script is designed to work in CI/CD pipelines and provides:

- Clear exit codes (0 for success, 1 for failure)
- Structured output for parsing
- Category-based execution for parallel testing
- Comprehensive reporting for test results
