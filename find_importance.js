const fs = require('fs');
const path = require('path');

function walk(dir, filter, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(filePath, filter, callback);
      }
    } else if (filter.test(file)) {
      callback(filePath);
    }
  }
}

const pattern = /importance/i;
walk(path.join(__dirname, 'src'), /\.(tsx|ts|js)$/, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (pattern.test(content)) {
    console.log(`Found pattern in: ${filePath}`);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        console.log(`  Line ${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
