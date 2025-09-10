import fs from 'fs';
import path from 'path';

const DOCS = path.join(process.cwd(), 'public', 'docs');

function list(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.join(base, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) out.push(...list(p, rel));
    else if (/\.(md|mdx|pdf)$/i.test(e.name)) out.push(rel);
  }
  return out.sort();
}

const files = list(DOCS);
fs.writeFileSync(path.join(DOCS, 'manifest.json'), JSON.stringify(files, null, 2));
console.log(`Wrote ${files.length} entries to public/docs/manifest.json`);
