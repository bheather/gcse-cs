#!/usr/bin/env node
const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const FILES = [
  { file: 'cs.js',    varName: 'CS_Q',    format: 'multiline'  },
  { file: 'dt.js',    varName: 'DT_Q',    format: 'singleline' },
  { file: 'maths.js', varName: 'MATHS_Q', format: 'singleline' },
];

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle options and update the answer letter to match
function processQuestion(q) {
  const answerIdx   = q.answer.charCodeAt(0) - 65;
  const correctText = q.options[answerIdx].replace(/^[A-D]\. /, '');
  const stripped    = q.options.map(o => o.replace(/^[A-D]\. /, ''));
  const shuffled    = shuffle(stripped);
  const newOptions  = shuffled.map((text, i) => String.fromCharCode(65 + i) + '. ' + text);
  const newAnswer   = String.fromCharCode(65 + shuffled.indexOf(correctText));
  return { ...q, options: newOptions, answer: newAnswer };
}

// Replace literal newlines inside single-quoted string literals so vm can parse the file.
// Scans character-by-character to avoid touching newlines outside strings.
function fixLiteralNewlines(src) {
  let out = '', inStr = false, escaped = false;
  for (const ch of src) {
    if (escaped)               { out += ch; escaped = false; continue; }
    if (ch === '\\' && inStr)  { out += ch; escaped = true;  continue; }
    if (ch === "'" && inStr)   { out += ch; inStr = false;   continue; }
    if (ch === "'" && !inStr)  { out += ch; inStr = true;    continue; }
    if (ch === '\n' && inStr)  { out += '\\n';               continue; }
    out += ch;
  }
  return out;
}

// Escape characters that need backslash-escaping in single-quoted JS string literals
function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

// Multi-line serialiser (used by cs.js)
// options:['A. …',     ← 3 spaces + "options:['" = 12 chars before quote
//          'B. …',     ← 12 spaces
function serializeMultiline(q, trailingComma) {
  const pad = ' '.repeat(12);
  return [
    `  {paper:'${esc(q.paper)}',topic:'${esc(q.topic)}',q:'${esc(q.q)}',`,
    `   options:['${esc(q.options[0])}',`,
    `${pad}'${esc(q.options[1])}',`,
    `${pad}'${esc(q.options[2])}',`,
    `${pad}'${esc(q.options[3])}'],`,
    `   answer:'${q.answer}',`,
    `   explanation:'${esc(q.explanation)}',`,
    `   memory_hook:'${esc(q.memory_hook)}'}${trailingComma ? ',' : ''}`,
  ].join('\n');
}

// Single-line serialiser (used by dt.js and maths.js)
function serializeSingleline(q, trailingComma) {
  const opts = q.options.map(o => `'${esc(o)}'`).join(',');
  return `  {paper:'${esc(q.paper)}',topic:'${esc(q.topic)}',q:'${esc(q.q)}',options:[${opts}],answer:'${q.answer}',explanation:'${esc(q.explanation)}',memory_hook:'${esc(q.memory_hook)}'}${trailingComma ? ',' : ''}`;
}

FILES.forEach(({ file, varName, format }) => {
  const filePath = path.join(__dirname, file);
  const content  = fs.readFileSync(filePath, 'utf8');

  const ctx = {};
  vm.runInNewContext(fixLiteralNewlines(content) + `\n__Q = ${varName};`, ctx);
  const processed = ctx.__Q.map(processQuestion);

  const serialize = format === 'multiline' ? serializeMultiline : serializeSingleline;
  const lines = [`const ${varName} = [`];
  let lastKey = null;

  processed.forEach((q, i) => {
    const key = `${q.paper}:${q.topic}`;
    if (key !== lastKey) {
      const label = format === 'multiline'
        ? `PAPER ${q.paper === 'p1' ? '1' : '2'}: ${q.topic}`
        : q.topic;
      lines.push(`  // ─── ${label} ───`);
      lastKey = key;
    }
    lines.push(serialize(q, i < processed.length - 1));
    if (format === 'multiline') lines.push('');
  });

  lines.push('];');
  lines.push('');

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`${file}: shuffled ${processed.length} questions.`);
});
