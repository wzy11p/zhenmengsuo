import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Copy only the website's runtime files. Never include docs, tests, or browser data.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const files = ['index.html'];
for (const [directory, extension] of [['css', /\.css$/], ['js', /\.js$/], ['assets', /\.(png|jpg)$/]]) {
  for (const filename of readdirSync(join(root, directory))) {
    const relative = `${directory}/${filename}`;
    if (!extension.test(filename) || !lstatSync(join(root, relative)).isFile()) {
      throw new Error(`Unexpected runtime asset: ${relative}`);
    }
    files.push(relative);
  }
}
const allowed = new Set(files);
function checkOutput(directory, prefix = '') {
  if (!lstatSync(directory).isDirectory()) throw new Error('Output must be a regular directory');
  for (const filename of readdirSync(directory)) {
    const relative = `${prefix}${filename}`;
    const path = join(directory, filename);
    if (lstatSync(path).isDirectory() && ['css', 'js', 'assets'].includes(relative)) {
      checkOutput(path, `${relative}/`);
    } else if (!lstatSync(path).isFile() || !allowed.has(relative)) {
      throw new Error(`Unexpected generated file; review before publishing: ${relative}`);
    }
  }
}
if (existsSync(output)) checkOutput(output);
for (const relative of files) {
  const target = join(output, relative);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, relative), target);
}
const html = readFileSync(join(output, 'index.html'), 'utf8');
for (const [, reference] of html.matchAll(/(?:src|href)="((?:assets|css|js)\/[^"?#]+)"/g)) {
  if (!allowed.has(reference)) throw new Error(`Missing page asset: ${reference}`);
}
console.log(`Validated ${files.length} runtime files in dist/.`);
