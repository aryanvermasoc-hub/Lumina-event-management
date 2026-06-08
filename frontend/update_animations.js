const fs = require('fs');
const path = require('path');

const cssPath = path.join('c:', 'event-app', 'frontend', 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');

const cssVars = `/* ── Smooth Animation Variables ────────────────────── */
:root {
  --ease-fluid: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-snappy: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  --trans-fast: 0.2s var(--ease-fluid);
  --trans-base: 0.4s var(--ease-fluid);
  --trans-slow: 0.6s var(--ease-fluid);
}

`;

if (!css.includes('--ease-fluid')) {
  css = cssVars + css;
}

css = css.replace(/transition: background-color 0\.4s ease, color 0\.4s ease;/g, 'transition: background-color var(--trans-base), color var(--trans-base);');
css = css.replace(/transition: all 0\.25s;/g, 'transition: all var(--trans-base);');
css = css.replace(/transition: all 0\.2s;/g, 'transition: all var(--trans-fast);');
css = css.replace(/transition: all 0\.4s cubic-bezier\(0\.175, 0\.885, 0\.32, 1\.275\);/g, 'transition: transform var(--trans-base), box-shadow var(--trans-base), border-color var(--trans-base); will-change: transform, box-shadow, border-color;');
css = css.replace(/transition:\s*border-color 160ms ease,\s*box-shadow 160ms ease,\s*transform 160ms ease,\s*background 160ms ease;/g, 'transition: border-color var(--trans-fast), box-shadow var(--trans-fast), transform var(--trans-fast), background var(--trans-fast); will-change: transform, box-shadow, border-color;');
css = css.replace(/transition: all 0\.3s ease;/g, 'transition: transform var(--trans-base), box-shadow var(--trans-base), background var(--trans-base), color var(--trans-base);');
css = css.replace(/transition: transform 0\.6s cubic-bezier\(0\.165, 0\.84, 0\.44, 1\);/g, 'transition: transform var(--trans-slow); will-change: transform;');
css = css.replace(/transition: background 140ms;/g, 'transition: background var(--trans-fast), color var(--trans-fast), border-color var(--trans-fast);');

fs.writeFileSync(cssPath, css);
console.log('CSS updated successfully.');

const appPath = path.join('c:', 'event-app', 'frontend', 'src', 'App.jsx');
let appJsx = fs.readFileSync(appPath, 'utf8');

const targetStr = "transition={{ type: 'spring', damping: 28, stiffness: 180, mass: 0.8 }}";

appJsx = appJsx.replace(/transition=\{\{\s*type:\s*'spring',\s*damping:\s*25,\s*stiffness:\s*300\s*\}\}/g, targetStr);
appJsx = appJsx.replace(/transition=\{\{\s*type:\s*'spring',\s*damping:\s*25,\s*stiffness:\s*200\s*\}\}/g, targetStr);
appJsx = appJsx.replace(/transition=\{\{\s*type:\s*'spring',\s*damping:\s*25\s*\}\}/g, targetStr);
appJsx = appJsx.replace(/transition=\{\{\s*type:\s*'spring',\s*damping:\s*20\s*\}\}/g, targetStr);
appJsx = appJsx.replace(/transition=\{\{\s*type:\s*'spring',\s*damping:\s*24\s*\}\}/g, targetStr);
appJsx = appJsx.replace(/transition=\{\{\s*type:\s*'spring',\s*damping:\s*24,\s*stiffness:\s*250,\s*opacity:\s*\{\s*duration:\s*0\.2\s*\}\s*\}\}/g, "transition={{ type: 'spring', damping: 28, stiffness: 180, mass: 0.8, opacity: { duration: 0.3 } }}");

if (!appJsx.includes('html { scroll-behavior: smooth; }')) {
  appJsx = appJsx.replace(/body\s*\{/, "html { scroll-behavior: smooth; }\n    body {");
}

fs.writeFileSync(appPath, appJsx);
console.log('App.jsx updated successfully.');
