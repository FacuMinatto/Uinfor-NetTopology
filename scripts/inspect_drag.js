const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split(/\r?\n/);

console.log('Searching for node positioning and dragging:');
lines.forEach((line, idx) => {
  if (line.includes('style.left') || line.includes('style.top') || line.includes('translate') || line.includes('renderNode')) {
    if (idx >= 450 && idx <= 1000) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
