import { checkDependencies, generateInstallationMessage } from './utils/dependencyCheck';

/**
 * Performs a check for required dependencies and displays status
 */
export function performStartupCheck(): void {
  // Check for required dependencies
  const { missingPackages, missingCommands, installed } = checkDependencies();
  
  // Clear previous log lines
  console.log('\n');
  
  // Display a banner for visibility
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                CONVERT4ME - DEPENDENCY CHECK                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  if (missingPackages.length > 0) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Some dependencies are missing!');
    console.log('\x1b[33m%s\x1b[0m', 'The application will still work, but some conversions may use fallback methods.');
    console.log('\nMissing packages:');
    missingPackages.forEach(pkg => console.log(`  - ${pkg}`));
    
    console.log('\nMissing commands:');
    missingCommands.forEach(cmd => console.log(`  - ${cmd}`));
    
    console.log('\n\x1b[36m%s\x1b[0m', 'How to install:');
    console.log(generateInstallationMessage(missingPackages));
  } else {
    console.log('\x1b[32m%s\x1b[0m', '✅ All required dependencies are installed!');
  }
  
  if (installed.length > 0) {
    console.log('\nInstalled packages:');
    installed.forEach(pkg => console.log(`  - ${pkg}`));
  }
  
  console.log('\n');
}

// Auto-run the check when this module is imported
performStartupCheck(); 