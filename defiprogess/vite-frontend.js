const { exec } = require('child_process');
const path = require('path');

// Start the Vite dev server directly
console.log("Starting Vite frontend development server...");

const viteProcess = exec('npx vite', { cwd: __dirname });

viteProcess.stdout.on('data', (data) => {
  console.log(`Vite: ${data}`);
});

viteProcess.stderr.on('data', (data) => {
  console.error(`Vite Error: ${data}`);
});

console.log("Vite server is starting... this may take a moment");
console.log("Frontend will be available at http://0.0.0.0:5173");