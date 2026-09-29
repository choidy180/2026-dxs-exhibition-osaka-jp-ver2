import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const files = [];
function collect(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (/\.(tsx?|jsx?)$/.test(file)) files.push(file);
  }
}
for (const directory of ['components', 'app', 'data', 'constants', 'hooks', 'utils']) {
  collect(path.join(root, directory));
}
const copy = new Map();
for (const file of files) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    // CSS template comments are developer notes rather than display copy.
    if (ts.isTaggedTemplateExpression(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (/[가-힣]/.test(text) && text.length < 500 && !text.includes('SELECT ')) {
        copy.set(text, (copy.get(text) ?? 0) + 1);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const entries = [...copy].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const output = process.argv[2];
if (output) fs.writeFileSync(output, JSON.stringify(entries.map(([text, count]) => ({ text, count })), null, 2));
console.log(`Extracted ${entries.length} Korean strings from ${files.length} files.`);
if (!output) console.log(entries.map(([text, count]) => `${count}\t${text}`).join('\n'));
