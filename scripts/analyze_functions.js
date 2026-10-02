import fs from 'fs';

const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split(/\r?\n/);

// Find all top-level functions defined in the IIFE
const functionRegex = /^\s{2}function\s+([a-zA-Z0-9_]+)\s*\(/;
const asyncFunctionRegex = /^\s{2}async\s+function\s+([a-zA-Z0-9_]+)\s*\(/;

const functions = [];
lines.forEach((line, idx) => {
  const match = line.match(functionRegex) || line.match(asyncFunctionRegex);
  if (match) {
    functions.push({ name: match[1], line: idx + 1 });
  }
});

console.log('Total functions found:', functions.length);
console.log(JSON.stringify(functions, null, 2));
