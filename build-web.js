const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const outDir = path.join(__dirname, 'www');

// List of top-level files and folders to include in the build
const includeItems = [
  'index.html',
  'lyrics.html',
  'login.html',
  'manifest.json',
  'sw.js',
  'vercel.json',
  'assets',
  'css',
  'js',
  'data',
  'en',
  'ja',
  'ko',
  'zh',
  'shared'
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const children = fs.readdirSync(src);
    for (const child of children) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log('--- Đang đóng gói web assets vào thư mục www/ ---');
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

for (const item of includeItems) {
  const srcPath = path.join(srcDir, item);
  const destPath = path.join(outDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    console.log(`✓ Đã sao chép: ${item}`);
  }
}

console.log('--- Hoàn tất đóng gói www/ thành công! ---');
