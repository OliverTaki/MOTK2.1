#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Comprehensive test runner for MOTK integration tests
 * Runs backend and frontend tests with performance monitoring
 */

const TEST_SUITES = {
  'api-integration': {
    name: 'API Integration Tests',
    command: 'npm',
    args: ['test', '--', '--testPathPattern=api-integration.test.ts'],
    timeout: 60000
  },
  'e2e-workflows': {
    name: 'End-to-End Workflow Tests',
    command: 'npm',
    args: ['test', '--', '--testPathPattern=e2e-workflows.test.ts'],
    timeout: 120000
  },
  'performance-benchmarks': {
    name: 'Performance Benchmark Tests',
    command: 'npm',
    args: ['test', '--', '--testPathPattern=performance-benchmarks.test.ts'],
    timeout: 180000
  },
  'concurrent-users': {
    name: 'Concurrent Users Tests',
    command: 'npm',
    args: ['test', '--', '--testPathPattern=concurrent-users.test.ts'],
    timeout: 240000
  },
  'frontend-e2e': {
    name: 'Frontend E2E Integration Tests',
    command: 'npm',
    args: ['run', 'test:frontend'],
    timeout: 120000,
    cwd: path.join(__dirname, '..')
  }
};

class TestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  async runTestSuite(suiteKey, suite) {
    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`Command: ${suite.command} ${suite.args.join(' ')}`);
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const child = spawn(suite.command, suite.args, {
        cwd: suite.cwd || process.cwd(),
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        console.log(`\n⏰ Test suite ${suite.name} timed out after ${suite.timeout}ms`);
        resolve({
          success: false,
          duration: Date.now() - startTime,
          error: 'Timeout',
          stdout,
          stderr
        });
      }, suite.timeout);

      child.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        console.log(`\n${success ? '✅' : '❌'} ${suite.name} ${success ? 'passed' : 'failed'} in ${duration}ms`);
        
        resolve({
          success,
          duration,
          code,
          stdout,
          stderr
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`\n❌ ${suite.name} failed with error: ${error.message}`);
        resolve({
          success: false,
          duration: Date.now() - startTime,
          error: error.message,
          stdout,
          stderr
        });
      });
    });
  }

  async runAllTests() {
    console.log('🚀 Starting MOTK Integration Test Suite');
    console.log('=====================================');

    const suiteKeys = Object.keys(TEST_SUITES);
    
    for (const suiteKey of suiteKeys) {
      const suite = TEST_SUITES[suiteKey];
      this.results[suiteKey] = await this.runTestSuite(suiteKey, suite);
    }

    this.generateReport();
  }

  async runSpecificTests(testNames) {
    console.log(`🎯 Running specific tests: ${testNames.join(', ')}`);
    console.log('=====================================');

    for (const testName of testNames) {
      if (TEST_SUITES[testName]) {
        const suite = TEST_SUITES[testName];
        this.results[testName] = await this.runTestSuite(testName, suite);
      } else {
        console.log(`❌ Unknown test suite: ${testName}`);
        this.results[testName] = {
          success: false,
          error: 'Unknown test suite',
          duration: 0
        };
      }
    }

    this.generateReport();
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const suiteKeys = Object.keys(this.results);
    const passedSuites = suiteKeys.filter(key => this.results[key].success);
    const failedSuites = suiteKeys.filter(key => !this.results[key].success);

    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`Test Suites: ${suiteKeys.length}`);
    console.log(`Passed: ${passedSuites.length}`);
    console.log(`Failed: ${failedSuites.length}`);

    if (passedSuites.length > 0) {
      console.log('\n✅ Passed Suites:');
      passedSuites.forEach(key => {
        const result = this.results[key];
        console.log(`  - ${TEST_SUITES[key].name} (${result.duration}ms)`);
      });
    }

    if (failedSuites.length > 0) {
      console.log('\n❌ Failed Suites:');
      failedSuites.forEach(key => {
        const result = this.results[key];
        console.log(`  - ${TEST_SUITES[key].name} (${result.duration}ms)`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
    }

    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    suiteKeys.forEach(key => {
      const result = this.results[key];
      const suite = TEST_SUITES[key];
      const avgTime = result.duration;
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${suite.name}: ${avgTime}ms`);
    });

    // Generate detailed report file
    this.generateDetailedReport();

    // Exit with appropriate code
    const exitCode = failedSuites.length > 0 ? 1 : 0;
    console.log(`\n${exitCode === 0 ? '🎉' : '💥'} Test run completed with exit code ${exitCode}`);
    
    if (process.env.CI !== 'true') {
      // In local development, don't exit to allow inspection
      console.log('Run completed. Check the detailed report at test-results.json');
    } else {
      process.exit(exitCode);
    }
  }

  generateDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      summary: {
        total: Object.keys(this.results).length,
        passed: Object.keys(this.results).filter(key => this.results[key].success).length,
        failed: Object.keys(this.results).filter(key => !this.results[key].success).length
      },
      suites: {}
    };

    Object.keys(this.results).forEach(key => {
      const result = this.results[key];
      const suite = TEST_SUITES[key];
      
      report.suites[key] = {
        name: suite.name,
        success: result.success,
        duration: result.duration,
        command: `${suite.command} ${suite.args.join(' ')}`,
        exitCode: result.code,
        error: result.error,
        // Don't include full stdout/stderr in JSON to keep it manageable
        hasOutput: !!(result.stdout || result.stderr)
      };
    });

    const reportPath = path.join(process.cwd(), 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.length === 0) {
    // Run all tests
    await runner.runAllTests();
  } else if (args[0] === '--list') {
    // List available test suites
    console.log('Available test suites:');
    Object.keys(TEST_SUITES).forEach(key => {
      console.log(`  - ${key}: ${TEST_SUITES[key].name}`);
    });
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('MOTK Integration Test Runner');
    console.log('Usage:');
    console.log('  node run-integration-tests.js                    # Run all tests');
    console.log('  node run-integration-tests.js [suite1] [suite2]  # Run specific suites');
    console.log('  node run-integration-tests.js --list             # List available suites');
    console.log('  node run-integration-tests.js --help             # Show this help');
    console.log('');
    console.log('Available test suites:');
    Object.keys(TEST_SUITES).forEach(key => {
      console.log(`  - ${key}: ${TEST_SUITES[key].name}`);
    });
  } else {
    // Run specific tests
    const validSuites = args.filter(arg => TEST_SUITES[arg]);
    const invalidSuites = args.filter(arg => !TEST_SUITES[arg]);
    
    if (invalidSuites.length > 0) {
      console.log(`❌ Unknown test suites: ${invalidSuites.join(', ')}`);
      console.log('Use --list to see available suites');
      process.exit(1);
    }
    
    await runner.runSpecificTests(validSuites);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});