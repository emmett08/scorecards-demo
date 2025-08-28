/* eslint-disable no-restricted-imports */
/* eslint-disable no-console */
import { transform, bundle } from 'lightningcss';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
/* eslint-enable no-restricted-imports */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginRoot = path.resolve(__dirname, '..');
const srcDir = path.resolve(pluginRoot, 'src/css');
const entryFile = path.resolve(srcDir, '__entry.css');
const srcFiles = [
  path.resolve(srcDir, 'tokens.css'),
  path.resolve(srcDir, 'globals.css'),
];

const distDir = path.resolve(pluginRoot, 'css');
const distFile = path.resolve(distDir, 'styles.css');

const args = process.argv.slice(2);
const watchMode = args.includes('--watch');

function assertSourcesExist() {
  const missing = srcFiles.filter(f => !fs.existsSync(f));
  if (missing.length) {
    console.error(chalk.red('Missing CSS source file(s):'));
    for (const m of missing) console.error(m);
    process.exit(1);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeEntryFile() {
  const rel = (p) => path.relative(srcDir, p).replace(/\\/g, '/');
  const contents =
    `@import "./${rel(srcFiles[0])}";\n` +
    `@import "./${rel(srcFiles[1])}";\n`;
  fs.writeFileSync(entryFile, contents);
}

async function buildCSS(logs = true) {
  assertSourcesExist();
  ensureDir(distDir);
  writeEntryFile();

  const { code: bundled } = bundle({
    filename: entryFile,
  });

  const { code } = transform({
    filename: 'styles.css',
    code: bundled,
    minify: true,
  });

  fs.writeFileSync(distFile, code);

  if (logs) {
    console.log(chalk.blue('CSS bundled and minified: ') + path.relative(pluginRoot, distFile));
    console.log(chalk.green('CSS file built successfully!'));
  }
}

function startWatch() {
  console.log(chalk.yellow('Watching for CSS changes...'));
  const watcher = fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith('.css')) return;
    const changed = path.resolve(srcDir, filename);
    if (srcFiles.includes(changed) || changed === entryFile) {
      console.log(chalk.yellow(`Detected ${eventType} in ${filename}, rebuilding...`));
      buildCSS(false).catch(err => console.error(chalk.red(err)));
    }
  });

  buildCSS().catch(err => {
    console.error(chalk.red(err));
    watcher.close();
    process.exit(1);
  });
}

if (watchMode) {
  startWatch();
} else {
  buildCSS().catch(err => {
    console.error(chalk.red(err));
    process.exit(1);
  });
}
