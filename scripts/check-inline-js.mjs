/* ==========================================================================
   Every inline <script> in this repository parses.

       node scripts/check-inline-js.mjs

   This exists because `flipbook` was completely dead and nothing noticed.

   An HTML parser ends a <script> element at the first literal `</script` in
   the source, whatever the JavaScript around it thinks. flipbook builds a
   standalone HTML file in a template literal, and that template contains
   script tags. The author escaped one of them:

       <script>${lib}<\/script><script src="../js/dyslexia-font.js" …></script>
                    ^^ escaped                                       ^^ not

   The second one is a literal `</script`, so the browser ended the page's own
   script there, 10,417 characters in. What was left was an unterminated
   template literal inside an unterminated function, so the whole block threw
   `SyntaxError: Unexpected end of input` and **not one line of the tool ran**.
   No controls, no book, no export. The page rendered its markup perfectly and
   the only evidence was one line in the console.

   The test is the browser's own tokenisation: cut each <script> body at the
   first literal `</script`, then ask node to parse what is left. A block the
   parser would truncate does not parse, which is the whole point. No browser,
   no network, no dependency.

   The convention this enforces, for anyone emitting script tags from
   JavaScript: write `<\/script`. Always. The backslash means nothing to
   JavaScript and everything to the HTML parser.
   ========================================================================== */

import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.github', 'fonts', 'docs', 'aicc_analysis']);

async function pages(dir = ROOT, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) { continue; }
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { await pages(full, out); }
    else if (e.name.endsWith('.html')) { out.push(path.relative(ROOT, full)); }
  }
  return out.sort();
}

/* The browser's rule, not a JavaScript-aware one: a <script> ends at the first
   `</script` in the byte stream, inside a string or not. */
function blocks(html) {
  const found = [];
  const open = /<script\b([^>]*)>/gi;
  let m;
  while ((m = open.exec(html))) {
    if (/\bsrc=/i.test(m[1])) { continue; }
    const from = m.index + m[0].length;
    const end = html.indexOf('</script', from);
    found.push({ line: html.slice(0, m.index).split('\n').length,
                 body: end === -1 ? html.slice(from) : html.slice(from, end),
                 terminated: end !== -1 });
    open.lastIndex = end === -1 ? html.length : end;
  }
  return found;
}

let checked = 0;
const failures = [];

for (const page of await pages()) {
  const html = await readFile(path.join(ROOT, page), 'utf8');
  for (const b of blocks(html)) {
    if (!b.body.trim()) { continue; }
    checked += 1;
    const tmp = path.join(tmpdir(), `inline-${process.pid}-${checked}.js`);
    await writeFile(tmp, b.body);
    try {
      await run(process.execPath, ['--check', tmp]);
    } catch (err) {
      const why = String(err.stderr || err).split('\n')
        .find(l => /SyntaxError|Unexpected/.test(l)) || 'did not parse';
      failures.push({ page, line: b.line, why: why.trim(), terminated: b.terminated });
    } finally {
      await unlink(tmp).catch(() => {});
    }
  }
}

console.log(`Inline scripts: ${checked} block(s) across the site.`);
if (failures.length) {
  console.log('');
  for (const f of failures) {
    console.log(`  ${f.page}:${f.line}  ${f.why}`);
    if (!f.terminated) { console.log('    (this block has no closing </script> at all)'); }
  }
  console.error(`\nFAIL: ${failures.length} inline script(s) do not parse as the browser cuts them.` +
                `\nA script tag written from JavaScript must escape its closing tag as <\\/script.`);
  process.exit(1);
}
console.log('OK: every inline script parses.');
