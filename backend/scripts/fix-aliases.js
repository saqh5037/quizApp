/**
 * Post-build script to fix TypeScript path aliases in compiled JS files
 * Replaces @alias paths with relative paths
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// Path alias mappings
const aliases = {
  '@/': './',
  '@config/': './config/',
  '@controllers/': './controllers/',
  '@models/': './models/',
  '@services/': './services/',
  '@middleware/': './middleware/',
  '@routes/': './routes/',
  '@utils/': './utils/',
  '@types/': './types/'
};

function getRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  const relativeFromDist = path.relative(distDir, fromDir);
  const depth = relativeFromDist ? relativeFromDist.split(path.sep).length : 0;

  let prefix = '';
  for (let i = 0; i < depth; i++) {
    prefix += '../';
  }

  return prefix || './';
}

function fixAliases(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const relativeFromDist = path.relative(distDir, path.dirname(filePath));
  const depth = relativeFromDist ? relativeFromDist.split(path.sep).length : 0;

  for (const [alias, replacement] of Object.entries(aliases)) {
    // Match require("@alias/...") or require('@alias/...')
    const regex = new RegExp(`require\\(["']${alias.replace('/', '\\/')}([^"']+)["']\\)`, 'g');

    if (regex.test(content)) {
      modified = true;
      content = content.replace(regex, (match, modulePath) => {
        let prefix = '';
        for (let i = 0; i < depth; i++) {
          prefix += '../';
        }
        if (!prefix) prefix = './';

        const newPath = prefix + replacement.slice(2) + modulePath;
        return `require("${newPath}")`;
      });
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed aliases in: ${path.relative(distDir, filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js')) {
      fixAliases(filePath);
    }
  }
}

console.log('Fixing path aliases in dist...');
walkDir(distDir);
console.log('Done!');
