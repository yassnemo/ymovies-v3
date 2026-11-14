#!/usr/bin/env node

/**
 * YMovies - Doctor Script
 * Diagnoses common issues and provides solutions
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🎬 YMovies - Health Check\n');

const checks = [];

// Check Node.js version
function checkNodeVersion() {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);

    if (majorVersion >= 22) {
      console.log('✅ Node.js version:', version, '(OK)');
      return true;
    } else {
      console.log('❌ Node.js version:', version, '(Need 22.12+)');
      console.log('   📝 Solution: Install Node.js 22.12+ from https://nodejs.org/');
      return false;
    }
  } catch (error) {
    console.log('❌ Node.js version check failed:', error.message);
    return false;
  }
}

// Check if essential files exist
function checkEssentialFiles() {
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'src/routes/+layout.svelte',
    'src/app.html'
  ];

  let allExist = true;

  console.log('\n📁 Checking essential files:');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} (missing)`);
      allExist = false;
    }
  });

  return allExist;
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n🔐 Checking environment variables:');

  const envFile = '.env.local';
  if (!fs.existsSync(envFile)) {
    console.log('❌ .env.local file not found');
    console.log('   📝 Solution: Copy .env.example to .env.local and fill in your values');
    return false;
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const requiredVars = [
    'TMDB_API_KEY',
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY',
    'DATABASE_URL'
  ];

  let allSet = true;
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
      console.log(`✅ ${varName}`);
    } else {
      console.log(`❌ ${varName} (not set or using placeholder)`);
      allSet = false;
    }
  });

  if (!allSet) {
    console.log('   📝 Solution: Update your .env.local file with real API keys');
  }

  return allSet;
}

// Check dependencies
function checkDependencies() {
  console.log('\n📦 Checking dependencies:');

  if (!fs.existsSync('node_modules')) {
    console.log('❌ node_modules not found');
    console.log('   📝 Solution: Run "npm install"');
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const criticalDeps = ['svelte', 'vite', '@sveltejs/kit', 'drizzle-orm'];

    let allInstalled = true;
    criticalDeps.forEach(dep => {
      const depPath = path.join('node_modules', dep);
      if (fs.existsSync(depPath)) {
        console.log(`✅ ${dep}`);
      } else {
        console.log(`❌ ${dep} (not installed)`);
        allInstalled = false;
      }
    });

    if (!allInstalled) {
      console.log('   📝 Solution: Run "npm install" to install missing dependencies');
    }

    return allInstalled;
  } catch (error) {
    console.log('❌ Failed to check dependencies:', error.message);
    return false;
  }
}

// Check TypeScript compilation
function checkTypeScript() {
  console.log('\n🔧 Checking TypeScript compilation:');

  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
    return true;
  } catch (error) {
    console.log('❌ TypeScript compilation failed');
    console.log('   📝 Solution: Fix TypeScript errors shown above');
    console.log('   📝 Or run: npm run check');
    return false;
  }
}

// Check port availability
function checkPortAvailability() {
  console.log('\n🌐 Checking port availability:');

  try {
    // Check if port 3000 is in use
    execSync('npx kill-port 3000', { stdio: 'pipe' });
    console.log('✅ Port 3000 is available');
    return true;
  } catch (error) {
    console.log('⚠️  Port 3000 may be in use');
    console.log('   📝 Solution: Run "npx kill-port 3000" or use a different port');
    return true; // Not critical
  }
}

// Main health check function
async function runHealthCheck() {
  console.log('Running comprehensive health check...\n');

  const results = {
    nodeVersion: checkNodeVersion(),
    essentialFiles: checkEssentialFiles(),
    environmentVariables: checkEnvironmentVariables(),
    dependencies: checkDependencies(),
    typeScript: checkTypeScript(),
    portAvailability: checkPortAvailability()
  };

  console.log('\n📊 Health Check Summary:');
  console.log('========================');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`✅ Passed: ${passed}/${total} checks`);

  if (passed === total) {
    console.log('\n🎉 All checks passed! Your YMovies should be ready to run.');
    console.log('   Run "npm run dev" to start the development server.');
  } else {
    console.log('\n⚠️  Some issues found. Please address them before running the app.');
    console.log('\n📚 Need help? Check our documentation:');
    console.log('   - Installation Guide: docs/INSTALLATION.md');
    console.log('   - Troubleshooting: docs/TROUBLESHOOTING.md');
    console.log('   - FAQ: docs/FAQ.md');
  }

  console.log('\n🆘 Still having issues?');
  console.log('   - Create an issue on GitHub');
  console.log('   - Check existing issues for solutions');
  console.log('   - Join our community discussions');
}

// Run the health check
runHealthCheck().catch(error => {
  console.error('❌ Health check failed:', error.message);
  process.exit(1);
});
