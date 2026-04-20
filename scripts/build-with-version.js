const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day}.${hours}${minutes}`;
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const newVersion = getVersion();
console.log(`Building version: ${newVersion}`);

packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

try {
  console.log('Building React app...');
  execSync('npm run build:react', { stdio: 'inherit', cwd: __dirname + '/..' });
  
  console.log('Building Electron app...');
  execSync('npx electron-builder', { stdio: 'inherit', cwd: __dirname + '/..' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
