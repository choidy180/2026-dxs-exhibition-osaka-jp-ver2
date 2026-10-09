/* Build-time JSX localization, with no DOM mutation or runtime translation service. */
// Next.js loads webpack/Turbopack loaders through CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ts = require('typescript');

function translateSource(source, filename) {
  // 챗봇은 질문 언어별 문안을 직접 선택하므로 사용자 입력과 답변을 재번역하지 않는다.
  if (/[\\/](?:components|constants)[\\/]ai-advisor(?:[\\/]|\.ts$)/.test(filename)) return source;
  if (!/\.(tsx|jsx)$/.test(filename) || /[\\/](i18n|node_modules)[\\/]/.test(filename)) return source;
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const clientDirective = file.statements.find(statement => ts.isExpressionStatement(statement)
    && ts.isStringLiteral(statement.expression) && statement.expression.text === 'use client');
  // Server layouts pass component references to client boundaries and must stay untouched.
  if (/[\\/]app[\\/]/.test(filename) && !clientDirective) return source;
  const edits = [];
  const attributes = new Set(['title', 'aria-label', 'aria-description', 'placeholder', 'alt']);
  let used = false;
  const decodeEntities = text => text.replace(/&(#x[\da-f]+|#\d+|gt|lt|amp|quot|apos|nbsp);/gi, (entity, key) => {
    if (key.startsWith('#')) return String.fromCodePoint(Number.parseInt(key.slice(key[1]?.toLowerCase() === 'x' ? 2 : 1), key[1]?.toLowerCase() === 'x' ? 16 : 10));
    return { gt: '>', lt: '<', amp: '&', quot: '"', apos: "'", nbsp: '\u00a0' }[key.toLowerCase()] ?? entity;
  });
  const add = (start, end, value) => { edits.push({ start, end, value }); used = true; };
  function visit(node) {
    if (ts.isJsxElement(node) && ['style', 'script', 'textarea'].includes(node.openingElement.tagName.getText(file))) return;
    if (ts.isJsxText(node)) {
      const lines = node.text.replace(/\r/g, '').split('\n');
      const text = lines.map((line, index) => {
        let value = line.replace(/\t/g, ' ');
        if (index > 0) value = value.replace(/^ +/, '');
        if (index < lines.length - 1) value = value.replace(/ +$/, '');
        return value;
      }).filter(Boolean).join(' ');
      if (/[가-힣]/.test(text)) add(node.pos, node.end, `{__exhibitionLocalize(${JSON.stringify(decodeEntities(text))})}`);
      return;
    }
    if (ts.isJsxAttribute(node) && attributes.has(node.name.text) && node.initializer) {
      const value = node.initializer;
      if (ts.isStringLiteral(value)) add(value.getStart(file), value.end, `{__exhibitionAttribute(${JSON.stringify(decodeEntities(value.text))})}`);
      else if (ts.isJsxExpression(value) && value.expression) {
        add(value.expression.getStart(file), value.expression.getStart(file), '__exhibitionAttribute(');
        add(value.expression.end, value.expression.end, ')');
      }
    }
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      add(node.expression.getStart(file), node.expression.getStart(file), '__exhibitionLocalize(');
      add(node.expression.end, node.expression.end, ')');
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!used) return source;
  // Insertions at the same position are stable; inner JSX replacements are processed first.
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let output = source;
  for (const edit of edits) output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
  const imports = '\nimport { localizeChildren as __exhibitionLocalize, localizeAttribute as __exhibitionAttribute } from "@/lib/i18n/translate";\n';
  const offset = clientDirective ? clientDirective.end : 0;
  return output.slice(0, offset) + imports + output.slice(offset);
}

module.exports = function exhibitionI18nLoader(source) {
  this.cacheable?.();
  return translateSource(source, this.resourcePath);
};
module.exports.translateSource = translateSource;
