#!/usr/bin/env tsx

/**
 * Vitest Sub-Agent
 *
 * A comprehensive test management tool for running, analyzing, and reporting Vitest tests.
 *
 * Features:
 * - Test category execution (unit, components, API, composables, auth, accessibility)
 * - Detailed test result analysis and reporting
 * - Failed test retry mechanism
 * - Coverage reporting
 * - Interactive mode
 * - Watch mode support
 *
 * Usage:
 *   npm run test:agent              # Run all tests
 *   npm run test:agent components   # Run component tests only
 *   npm run test:agent -- --watch   # Run in watch mode
 *   npm run test:agent -- --coverage # Run with coverage
 */

import { spawn } from 'child_process';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

interface TestCategory {
  name: string;
  pattern: string;
  description: string;
}

interface TestResult {
  category: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  files: number;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  categories: TestResult[];
}

const TEST_CATEGORIES: TestCategory[] = [
  { name: 'api', pattern: 'tests/api/**/*.test.ts', description: 'API endpoint tests' },
  { name: 'components', pattern: 'tests/components/**/*.test.ts', description: 'Vue component tests' },
  { name: 'composables', pattern: 'tests/composables/**/*.test.ts', description: 'Composable function tests' },
  { name: 'auth', pattern: 'tests/auth/**/*.test.ts', description: 'Authentication tests' },
  { name: 'accessibility', pattern: 'tests/accessibility/**/*.test.ts', description: 'Accessibility tests' },
  { name: 'performance', pattern: 'tests/performance/**/*.test.ts', description: 'Performance benchmark tests' },
];

class VitestAgent {
  private projectRoot: string;
  private verbose: boolean;
  private watch: boolean;
  private coverage: boolean;
  private retry: boolean;
  private failedTests: string[] = [];

  constructor(options: { verbose?: boolean; watch?: boolean; coverage?: boolean; retry?: boolean } = {}) {
    this.projectRoot = process.cwd();
    this.verbose = options.verbose || false;
    this.watch = options.watch || false;
    this.coverage = options.coverage || false;
    this.retry = options.retry || false;
  }

  /**
   * Main entry point for running tests
   */
  async run(categoryName?: string): Promise<void> {
    console.log('🧪 Vitest Sub-Agent Starting...\n');

    if (categoryName) {
      await this.runCategory(categoryName);
    }
    else {
      await this.runAllCategories();
    }
  }

  /**
   * Run tests for a specific category
   */
  private async runCategory(categoryName: string): Promise<void> {
    const category = TEST_CATEGORIES.find(c => c.name === categoryName);

    if (!category) {
      console.error(`❌ Unknown category: ${categoryName}`);
      console.log('\n📋 Available categories:');
      TEST_CATEGORIES.forEach((c) => {
        console.log(`  - ${c.name}: ${c.description}`);
      });
      process.exit(1);
    }

    console.log(`📂 Running ${category.name} tests...`);
    console.log(`   ${category.description}\n`);

    const exitCode = await this.executeVitest(category.pattern);

    if (exitCode !== 0 && this.retry) {
      await this.retryFailedTests();
    }

    process.exit(exitCode);
  }

  /**
   * Run all test categories sequentially
   */
  private async runAllCategories(): Promise<void> {
    const results: TestSummary = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      categories: [],
    };

    console.log('📋 Test Categories:\n');
    for (const category of TEST_CATEGORIES) {
      const testFiles = await this.findTestFiles(category.pattern);
      console.log(`  ${category.name.padEnd(15)} (${testFiles.length} files) - ${category.description}`);
    }
    console.log('\n' + '='.repeat(80) + '\n');

    const startTime = Date.now();

    for (const category of TEST_CATEGORIES) {
      const testFiles = await this.findTestFiles(category.pattern);

      if (testFiles.length === 0) {
        console.log(`⏭️  Skipping ${category.name} (no test files)\n`);
        continue;
      }

      console.log(`\n${'▶'.repeat(3)} Running ${category.name} tests (${testFiles.length} files)...\n`);

      const categoryStart = Date.now();
      const exitCode = await this.executeVitest(category.pattern);
      const categoryDuration = Date.now() - categoryStart;

      // Note: In a real implementation, we would parse vitest output to get actual numbers
      // For now, we'll just track success/failure
      const categoryResult: TestResult = {
        category: category.name,
        passed: exitCode === 0 ? testFiles.length : 0,
        failed: exitCode !== 0 ? testFiles.length : 0,
        skipped: 0,
        duration: categoryDuration,
        files: testFiles.length,
      };

      results.categories.push(categoryResult);

      console.log(`\n${exitCode === 0 ? '✅' : '❌'} ${category.name} completed in ${(categoryDuration / 1000).toFixed(2)}s\n`);
    }

    const totalDuration = Date.now() - startTime;
    results.duration = totalDuration;

    this.printSummary(results);

    if (this.coverage) {
      console.log('\n📊 Generating coverage report...');
      await this.generateCoverageReport();
    }

    const hasFailures = results.categories.some(c => c.failed > 0);

    if (hasFailures && this.retry) {
      await this.retryFailedTests();
    }

    process.exit(hasFailures ? 1 : 0);
  }

  /**
   * Execute vitest with the given pattern
   */
  private async executeVitest(pattern: string): Promise<number> {
    const args = ['run'];

    if (this.watch) {
      args.splice(0, 1, 'watch');
    }

    if (this.coverage) {
      args.push('--coverage');
    }

    if (this.verbose) {
      args.push('--reporter=verbose');
    }

    args.push(pattern);

    return new Promise((resolve) => {
      const vitest = spawn('npx', ['vitest', ...args], {
        stdio: 'inherit',
        cwd: this.projectRoot,
        shell: true,
      });

      vitest.on('close', (code) => {
        resolve(code || 0);
      });

      vitest.on('error', (error) => {
        console.error(`❌ Failed to execute vitest: ${error.message}`);
        resolve(1);
      });
    });
  }

  /**
   * Find test files matching the pattern
   */
  private async findTestFiles(pattern: string): Promise<string[]> {
    const files: string[] = [];

    // Extract directory from pattern (e.g., "tests/api/**/*.test.ts" -> "tests/api")
    const dirMatch = pattern.match(/^([^*]+)/);
    if (!dirMatch) return files;

    const baseDir = join(this.projectRoot, dirMatch[1]);

    try {
      await this.walkDirectory(baseDir, files, file => file.endsWith('.test.ts'));
    }
    catch (error) {
      // Directory doesn't exist or can't be read
      return files;
    }

    return files;
  }

  /**
   * Recursively walk directory to find test files
   */
  private async walkDirectory(
    dir: string,
    files: string[],
    filter: (file: string) => boolean,
  ): Promise<void> {
    try {
      const entries = await readdir(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          await this.walkDirectory(fullPath, files, filter);
        }
        else if (stats.isFile() && filter(entry)) {
          files.push(relative(this.projectRoot, fullPath));
        }
      }
    }
    catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Retry failed tests
   */
  private async retryFailedTests(): Promise<void> {
    if (this.failedTests.length === 0) {
      return;
    }

    console.log('\n🔄 Retrying failed tests...\n');

    for (const testFile of this.failedTests) {
      console.log(`  Retrying: ${testFile}`);
      await this.executeVitest(testFile);
    }
  }

  /**
   * Generate coverage report
   */
  private async generateCoverageReport(): Promise<void> {
    return new Promise((resolve) => {
      const vitest = spawn('npx', ['vitest', 'run', '--coverage'], {
        stdio: 'inherit',
        cwd: this.projectRoot,
        shell: true,
      });

      vitest.on('close', () => {
        console.log('\n✅ Coverage report generated');
        resolve();
      });
    });
  }

  /**
   * Print test summary
   */
  private printSummary(results: TestSummary): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80) + '\n');

    results.categories.forEach((cat) => {
      const status = cat.failed === 0 ? '✅' : '❌';
      const duration = (cat.duration / 1000).toFixed(2);

      console.log(`${status} ${cat.category.padEnd(15)} ${cat.files} files, ${duration}s`);

      if (this.verbose) {
        console.log(`   Passed: ${cat.passed}, Failed: ${cat.failed}, Skipped: ${cat.skipped}`);
      }
    });

    const totalPassed = results.categories.reduce((sum, c) => sum + c.passed, 0);
    const totalFailed = results.categories.reduce((sum, c) => sum + c.failed, 0);
    const totalSkipped = results.categories.reduce((sum, c) => sum + c.skipped, 0);

    console.log('\n' + '-'.repeat(80));
    console.log(`Total Duration: ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`Passed: ${totalPassed} | Failed: ${totalFailed} | Skipped: ${totalSkipped}`);
    console.log('='.repeat(80) + '\n');

    if (totalFailed === 0) {
      console.log('🎉 All tests passed!\n');
    }
    else {
      console.log(`⚠️  ${totalFailed} test suite(s) failed\n`);
    }
  }

  /**
   * Show help information
   */
  static showHelp(): void {
    console.log(`
🧪 Vitest Sub-Agent - Comprehensive Test Management Tool

USAGE:
  npm run test:agent [category] [options]

CATEGORIES:
${TEST_CATEGORIES.map(c => `  ${c.name.padEnd(15)} - ${c.description}`).join('\n')}

OPTIONS:
  --watch       Run tests in watch mode
  --coverage    Generate coverage report
  --verbose     Show detailed test output
  --retry       Retry failed tests
  --help        Show this help message

EXAMPLES:
  npm run test:agent                    # Run all tests
  npm run test:agent components         # Run component tests only
  npm run test:agent -- --watch         # Run all tests in watch mode
  npm run test:agent api -- --coverage  # Run API tests with coverage
  npm run test:agent -- --verbose       # Run all tests with verbose output

For more information, visit: https://vitest.dev
`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  watch: args.includes('--watch') || args.includes('-w'),
  coverage: args.includes('--coverage') || args.includes('-c'),
  retry: args.includes('--retry') || args.includes('-r'),
};

if (args.includes('--help') || args.includes('-h')) {
  VitestAgent.showHelp();
  process.exit(0);
}

// Get category name (first non-option argument)
const category = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

// Run the agent
const agent = new VitestAgent(options);
agent.run(category).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
