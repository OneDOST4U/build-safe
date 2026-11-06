const { execSync } = require('child_process');
const path = require('path');

// Automatically create Windows desktop shortcut on install
if (process.platform === 'win32') {
  try {
    const psScript = path.join(__dirname, 'create-desktop-shortcut.ps1');
    execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, { stdio: 'inherit' });
  } catch (e) {
    // Silent fallback if execution policy is restricted
  }
}
