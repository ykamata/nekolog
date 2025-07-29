#!/usr/bin/env node

import { execSync } from 'child_process';
import { exit } from 'process';

console.log('🔍 Starting build validation process...');

// Function to execute command and handle errors
const runCommand = (command, errorMessage) => {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  }
  catch (error) {
    console.error(`\n❌ ${errorMessage}`);
    console.error(error.message);
    return false;
  }
};

// Main validation process
try {
  // Step 1: Run ESLint auto-fix to fix formatting issues
  console.log('\n🔧 Running ESLint auto-fix...');
  runCommand('npm run lint:fix', 'ESLint auto-fix failed!');

  // Step 2: Run TypeScript type checking
  console.log('\n🔎 Running TypeScript type checking...');
  const typecheckResult = runCommand(
    'npm run typecheck',
    'TypeScript type checking failed!',
  );
  if (!typecheckResult) exit(1);
  console.log('✅ TypeScript type checking passed!');

  // Step 3: Run production build
  console.log('\n🏗️ Generating production build...');
  const buildResult = runCommand('npm run build', 'Production build failed!');
  if (!buildResult) exit(1);
  console.log('✅ Production build generated successfully!');

  console.log('\n🎉 Build validation completed successfully!');
}
catch (error) {
  console.error('\n❌ Build validation failed with an unexpected error!');
  console.error(error.message);
  exit(1);
}
