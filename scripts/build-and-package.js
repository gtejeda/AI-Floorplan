#!/usr/bin/env node

/**
 * Build and Package Script
 * Automates the process of building and packaging the application for distribution
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(number, total, message) {
  log(`\n[${ number}/${total}] ${message}`, 'cyan');
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function exec(command, options = {}) {
  try {
    return execSync(command, {
      stdio: 'inherit',
      ...options
    });
  } catch (err) {
    error(`Command failed: ${command}`);
    throw err;
  }
}

function checkFile(filePath, required = true) {
  if (fs.existsSync(filePath)) {
    success(`Found: ${filePath}`);
    return true;
  } else {
    if (required) {
      error(`Missing required file: ${filePath}`);
      return false;
    } else {
      warning(`Optional file not found: ${filePath}`);
      return false;
    }
  }
}

async function main() {
  log('\n🏗️  MicroVillas Investment Platform - Build & Package\n', 'blue');

  const totalSteps = 8;
  let currentStep = 0;

  try {
    // Step 1: Check prerequisites
    currentStep++;
    step(currentStep, totalSteps, 'Checking prerequisites');

    checkFile('package.json', true);
    checkFile('forge.config.js', true);
    checkFile('tsconfig.json', true);

    // Check for icons
    const hasWindowsIcon = checkFile('public/assets/icon.ico', false);
    const hasMacIcon = checkFile('public/assets/icon.icns', false);

    if (!hasWindowsIcon || !hasMacIcon) {
      warning('Application icons missing. See DISTRIBUTION_GUIDE.md for icon creation instructions.');
      warning('Build will continue but installers may use default icons.');
    }

    // Step 2: Clean previous builds
    currentStep++;
    step(currentStep, totalSteps, 'Cleaning previous builds');

    if (fs.existsSync('out')) {
      log('Removing out/ directory...');
      fs.rmSync('out', { recursive: true, force: true });
      success('Cleaned out/ directory');
    }

    if (fs.existsSync('.vite')) {
      log('Removing .vite/ directory...');
      fs.rmSync('.vite', { recursive: true, force: true });
      success('Cleaned .vite/ directory');
    }

    // Step 3: Install dependencies
    currentStep++;
    step(currentStep, totalSteps, 'Installing dependencies');

    log('Running npm install...');
    exec('npm install');
    success('Dependencies installed');

    // Step 4: Run linter
    currentStep++;
    step(currentStep, totalSteps, 'Running code quality checks');

    try {
      log('Running ESLint...');
      exec('npm run lint', { stdio: 'pipe' });
      success('Linting passed');
    } catch (err) {
      warning('Linting failed. Please fix errors before distribution.');
      warning('Continuing with build anyway...');
    }

    // Step 5: Run tests
    currentStep++;
    step(currentStep, totalSteps, 'Running tests');

    try {
      log('Running unit tests...');
      exec('npm run test:unit', { stdio: 'pipe' });
      success('Unit tests passed');
    } catch (err) {
      warning('Tests failed. Please review before distribution.');
      warning('Continuing with build anyway...');
    }

    // Step 6: Build application
    currentStep++;
    step(currentStep, totalSteps, 'Building application');

    const platform = process.platform;
    log(`Building for current platform: ${platform}`);

    if (process.argv.includes('--all-platforms')) {
      log('Building for all platforms...');
      exec('npm run make');
    } else if (process.argv.includes('--windows')) {
      log('Building for Windows...');
      exec('npm run make -- --platform=win32');
    } else if (process.argv.includes('--macos')) {
      log('Building for macOS...');
      exec('npm run make -- --platform=darwin');
    } else {
      log('Building for current platform...');
      exec('npm run make');
    }

    success('Build completed');

    // Step 7: Verify output
    currentStep++;
    step(currentStep, totalSteps, 'Verifying build output');

    if (!fs.existsSync('out/make')) {
      throw new Error('Build output directory not found');
    }

    const makeDir = 'out/make';
    const subdirs = fs.readdirSync(makeDir);

    log('\nBuild artifacts:');
    subdirs.forEach(subdir => {
      const subdirPath = path.join(makeDir, subdir);
      if (fs.statSync(subdirPath).isDirectory()) {
        log(`  - ${subdir}/`, 'green');

        // List files in subdirectory
        const walk = (dir, indent = 4) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              log(`${' '.repeat(indent)}${file}/`, 'yellow');
              walk(filePath, indent + 2);
            } else {
              const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
              log(`${' '.repeat(indent)}${file} (${sizeMB} MB)`, 'cyan');
            }
          });
        };

        walk(subdirPath);
      }
    });

    success('Build verification complete');

    // Step 8: Summary
    currentStep++;
    step(currentStep, totalSteps, 'Build summary');

    log('\n' + '='.repeat(60));
    log('Build completed successfully!', 'green');
    log('='.repeat(60));

    log('\nNext steps:');
    log('  1. Test the installers on clean systems');
    log('  2. Review DISTRIBUTION_GUIDE.md for code signing');
    log('  3. Create GitHub Release with installers');
    log('  4. Update website/download page');

    log('\nBuild output location:');
    log(`  ${path.resolve('out/make')}`, 'cyan');

    if (!hasWindowsIcon || !hasMacIcon) {
      log('\n⚠️  Don\'t forget to create application icons!', 'yellow');
      log('  See DISTRIBUTION_GUIDE.md for instructions', 'yellow');
    }

    log('\n✨ Done!\n', 'green');

  } catch (err) {
    error(`\n✗ Build failed at step ${currentStep}/${totalSteps}`);
    error(err.message);
    process.exit(1);
  }
}

// Parse command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Usage: node scripts/build-and-package.js [options]

Options:
  --all-platforms    Build for all platforms (Windows, macOS, Linux)
  --windows          Build for Windows only
  --macos            Build for macOS only
  --help             Show this help message

Examples:
  node scripts/build-and-package.js                  # Build for current platform
  node scripts/build-and-package.js --windows        # Build for Windows
  node scripts/build-and-package.js --all-platforms  # Build for all platforms
`);
  process.exit(0);
}

main().catch(err => {
  error(err);
  process.exit(1);
});
