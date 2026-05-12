#!/usr/bin/env node
const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cs.js');
const content  = fs.readFileSync(filePath, 'utf8');

// Parse cs.js to obtain the question array
// (const declarations don't attach to the vm context; appending an implicit
//  global assignment is the standard workaround)
const ctx = {};
vm.runInNewContext(content + '\n__CS_Q = CS_Q;', ctx);
const questions = ctx.__CS_Q;

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle each question's options and update the answer letter to match
const processed = questions.map(q => {
  const answerIdx  = q.answer.charCodeAt(0) - 65; // A→0, B→1 …
  const correctText = q.options[answerIdx].replace(/^[A-D]\. /, '');

  const stripped  = q.options.map(o => o.replace(/^[A-D]\. /, ''));
  const shuffled  = shuffle(stripped);
  const newOptions = shuffled.map((text, i) => String.fromCharCode(65 + i) + '. ' + text);
  const newAnswer  = String.fromCharCode(65 + shuffled.indexOf(correctText));

  return { ...q, options: newOptions, answer: newAnswer };
});

// Escape single quotes and backslashes for single-quoted JS string literals
function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Serialise one question in the same multi-line format as the source file
// Options 2-4 are indented to align with the opening quote of option 1:
//   options:['A. …',     ← 3 spaces + "options:['" = 12 chars before quote
//            'B. …',     ← 12 spaces
function serializeQuestion(q, trailingComma) {
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

// Rebuild the file, re-inserting section comments when the topic changes
const lines = ['const CS_Q = ['];
let lastKey = null;

processed.forEach((q, i) => {
  const key = `${q.paper}:${q.topic}`;
  lines.push(''); // blank line before every question
  if (key !== lastKey) {
    const paperNum = q.paper === 'p1' ? '1' : '2';
    lines.push(`  // ─── PAPER ${paperNum}: ${q.topic} ───`);
    lastKey = key;
  }
  lines.push(serializeQuestion(q, i < processed.length - 1));
});

lines.push('];');
lines.push('');

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`Shuffled answers for ${processed.length} questions.`);
