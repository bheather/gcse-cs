#!/usr/bin/env node
const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const FILES = [
  { file: 'cs.js',    varName: 'CS_Q',    format: 'multiline'  },
  { file: 'dt.js',    varName: 'DT_Q',    format: 'singleline' },
  { file: 'maths.js', varName: 'MATHS_Q', format: 'singleline' },
];

// ── Parsing helpers ──────────────────────────────────────────────────────────

function fixLiteralNewlines(src) {
  let out = '', inStr = false, escaped = false;
  for (const ch of src) {
    if (escaped)              { out += ch; escaped = false; continue; }
    if (ch === '\\' && inStr) { out += ch; escaped = true;  continue; }
    if (ch === "'" && inStr)  { out += ch; inStr = false;   continue; }
    if (ch === "'" && !inStr) { out += ch; inStr = true;    continue; }
    if (ch === '\n' && inStr) { out += '\\n';               continue; }
    out += ch;
  }
  return out;
}

// ── Serialisation ────────────────────────────────────────────────────────────

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

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

function serializeSingleline(q, trailingComma) {
  const opts = q.options.map(o => `'${esc(o)}'`).join(',');
  return `  {paper:'${esc(q.paper)}',topic:'${esc(q.topic)}',q:'${esc(q.q)}',options:[${opts}],answer:'${q.answer}',explanation:'${esc(q.explanation)}',memory_hook:'${esc(q.memory_hook)}'}${trailingComma ? ',' : ''}`;
}

function writeBack(filePath, varName, format, questions) {
  const serialize = format === 'multiline' ? serializeMultiline : serializeSingleline;
  const lines = [`const ${varName} = [`];
  let lastKey = null;

  questions.forEach((q, i) => {
    const key = `${q.paper}:${q.topic}`;
    if (key !== lastKey) {
      const label = format === 'multiline'
        ? `PAPER ${q.paper === 'p1' ? '1' : '2'}: ${q.topic}`
        : q.topic;
      lines.push(`  // ─── ${label} ───`);
      lastKey = key;
    }
    lines.push(serialize(q, i < questions.length - 1));
    if (format === 'multiline') lines.push('');
  });

  lines.push('];');
  lines.push('');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

// ── Duplicate detection & replacement ───────────────────────────────────────

// Find a replacement text from other questions in the same topic,
// falling back to the whole file. Returns null if nothing suitable found.
function findReplacement(allQuestions, currentIdx, usedTexts) {
  const currentQ = allQuestions[currentIdx];
  const topicKey = `${currentQ.paper}:${currentQ.topic}`;
  const used = new Set(usedTexts);

  // Prefer same paper+topic, then any question in the file
  const order = [
    allQuestions.filter((q, i) => i !== currentIdx && `${q.paper}:${q.topic}` === topicKey),
    allQuestions.filter((q, i) => i !== currentIdx && `${q.paper}:${q.topic}` !== topicKey),
  ];

  for (const group of order) {
    for (const q of group) {
      for (const opt of q.options) {
        const text = opt.replace(/^[A-D]\. /, '');
        if (!used.has(text)) return text;
      }
    }
  }
  return null;
}

function stripPrefix(opt) {
  return opt.replace(/^[A-D]\. /, '');
}

function fixDuplicates(questions) {
  const report = [];

  const fixed = questions.map((q, idx) => {
    const texts = q.options.map(stripPrefix);
    const answerIdx = q.answer.charCodeAt(0) - 65;

    // Build a frequency map of option texts
    const freq = new Map();
    texts.forEach((t, i) => freq.set(t, [...(freq.get(t) || []), i]));

    const dupes = [...freq.values()].filter(idxs => idxs.length > 1);
    if (dupes.length === 0) return q;

    const newTexts = [...texts];
    const changes  = [];

    for (const dupeIdxs of dupes) {
      // Replace the first duplicate whose position ≠ correct answer
      const toReplace = dupeIdxs.find(i => i !== answerIdx);
      if (toReplace === undefined) continue; // all copies are the correct answer — skip

      const replacement = findReplacement(questions, idx, newTexts);
      const oldText = newTexts[toReplace];
      newTexts[toReplace] = replacement ?? '[NEEDS DISTRACTOR]';
      changes.push({ pos: toReplace, oldText, newText: newTexts[toReplace] });
    }

    if (changes.length === 0) return q;

    const newOptions = newTexts.map((t, i) => String.fromCharCode(65 + i) + '. ' + t);
    report.push({ q, changes, newOptions });
    return { ...q, options: newOptions };
  });

  return { fixed, report };
}

// ── Main ─────────────────────────────────────────────────────────────────────

let totalModified = 0;

FILES.forEach(({ file, varName, format }) => {
  const filePath = path.join(__dirname, file);
  const content  = fs.readFileSync(filePath, 'utf8');

  const ctx = {};
  vm.runInNewContext(fixLiteralNewlines(content) + `\n__Q = ${varName};`, ctx);

  const { fixed, report } = fixDuplicates(ctx.__Q);

  if (report.length > 0) {
    writeBack(filePath, varName, format, fixed);
  }

  console.log(`\n${file}: ${report.length} question(s) modified`);

  report.forEach(({ q, changes, newOptions }) => {
    console.log(`\n  Q: ${q.q.slice(0, 80)}${q.q.length > 80 ? '…' : ''}`);
    changes.forEach(({ pos, oldText, newText }) => {
      const letter = String.fromCharCode(65 + pos);
      console.log(`  ${letter}. was: ${oldText}`);
      console.log(`  ${letter}. now: ${newText}`);
    });
  });

  totalModified += report.length;
});

console.log(`\nTotal modified: ${totalModified}`);
