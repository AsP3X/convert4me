import { execSync } from 'child_process';

// List of required dependencies for optimal functionality
export const requiredDependencies = {
  'poppler-utils': ['pdftoppm', 'pdfimages'],
  'imagemagick': ['convert'],
  'ghostscript': ['gs'],
  'wkhtmltopdf': ['wkhtmltoimage'],
  'zip': ['zip'],
  'tar': ['tar'],
  'gzip': ['gzip']
};

// Store command availability status to avoid repeated checks
const commandAvailability: { [key: string]: boolean } = {};

/**
 * Check if a command is available in the system
 */
export function isCommandAvailable(command: string): boolean {
  if (commandAvailability[command] !== undefined) {
    return commandAvailability[command];
  }
  
  try {
    execSync(`which ${command}`);
    commandAvailability[command] = true;
    return true;
  } catch {
    commandAvailability[command] = false;
    console.log(`Command '${command}' is not available.`);
    return false;
  }
}

/**
 * Check system dependencies and return a list of missing packages
 */
export function checkDependencies(): { 
  missingPackages: string[]; 
  missingCommands: string[];
  installed: string[];
} {
  const missingPackages: string[] = [];
  const missingCommands: string[] = [];
  const installed: string[] = [];

  // Check each package and its associated commands
  for (const [packageName, commands] of Object.entries(requiredDependencies)) {
    let packageMissing = false;
    
    for (const command of commands) {
      if (!isCommandAvailable(command)) {
        packageMissing = true;
        missingCommands.push(command);
      }
    }
    
    if (packageMissing) {
      missingPackages.push(packageName);
    } else {
      installed.push(packageName);
    }
  }

  return { missingPackages, missingCommands, installed };
}

/**
 * Generate an installation message for missing dependencies
 */
export function generateInstallationMessage(missingPackages: string[]): string {
  if (missingPackages.length === 0) {
    return '';
  }

  const platform = process.platform;
  let message = 'Install missing dependencies with:\n\n';
  
  if (platform === 'linux') {
    // Debian/Ubuntu
    message += `sudo apt install ${missingPackages.join(' ')}\n\n`;
    // Fedora/RHEL
    message += `# Or for Fedora/RHEL based systems:\nsudo dnf install ${missingPackages.join(' ')}\n`;
  } else if (platform === 'darwin') {
    // macOS with Homebrew
    message += `brew install ${missingPackages.join(' ')}\n`;
  } else if (platform === 'win32') {
    message += 'For Windows, consider installing these tools manually or via Chocolatey:\n';
    message += `choco install ${missingPackages.map(pkg => pkg.replace('-', '')).join(' ')}\n`;
  }
  
  return message;
} 