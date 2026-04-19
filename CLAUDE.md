# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A multi-subject GCSE revision quiz app. Everything lives in `index.html` (HTML, CSS, JS) plus separate question files per subject. No build step, no framework, no dependencies — open `index.html` directly in a browser or serve over HTTP.

## Architecture

**Question files** (one per subject):
- `cs.js` — exports `CS_Q` (Computer Science, OCR J277)
- `maths.js` — exports `MATHS_Q` (Mathematics, OCR J560)
- `dt.js` — exports `DT_Q` (Design & Technology, OCR J310)

**`index.html`** is structured in three sections:

1. **CSS** (`<style>`) — CSS custom properties for the colour scheme (green/red/amber states), plus styles for lock, subject selection, quiz, and score screens.

2. **HTML** — Three top-level screens toggled by `showScreen(id)`: `#lock-screen` (password gate), `#subject-screen` (subject picker), `#quiz-screen` (the quiz UI). Dynamic content is injected into `#quiz-area`; topic filter buttons are rendered dynamically into `#topic-row`.

3. **JavaScript** (`<script>`) — Entirely vanilla JS. Key pieces:
   - `SUBJECTS` — config object mapping subject keys to `{ label, subtitle, icon, questions, filters }`. Adding a new subject means adding an entry here plus a new question file.
   - `state` — single mutable object tracking current subject key, topic filter, shuffled session, current index, score, streak, and answer phase (`'unanswered'` → `'retry'` → `'correct'`/`'correct-retry'`/`'failed'`).
   - Screen flow: `checkPassword()` → `showScreen('subject-screen')` → `selectSubject(key)` → `showStart()` → `startQuiz()` → `showQuestion()` → `showScore()`.
   - Answer logic: `selectAnswer(letter)` drives the two-attempt state machine; `showFeedback(type, q)` renders the result box and memory hook.

## Quiz behaviour

- Password stored as SHA-256 hash; see `README.md` for how to change it.
- Sessions are 10 randomly shuffled questions drawn from the filtered pool.
- Each question allows 2 attempts. First correct = full credit + streak. Second correct = credit + streak. Both wrong = streak reset, correct answer revealed.
- Topic filters use the `paper` field on each question object as the filter key (e.g. `'p1'`/`'p2'` for CS, `'number'`/`'algebra'` for Maths).

## Adding questions

Add objects to the relevant subject array following this schema:

```js
{
  paper: 'p1',           // filter key — matches a filter value in SUBJECTS config
  topic: 'Topic Name',   // displayed in the question card header
  q: 'Question text',
  options: ['A. ...', 'B. ...', 'C. ...', 'D. ...'],
  answer: 'B',           // letter matching the correct option
  explanation: '...',
  memory_hook: '...'
}
```

## Adding a new subject

1. Create `subjectname.js` with `const SUBJECT_Q = [...]`
2. Add `<script src="subjectname.js"></script>` to `index.html`
3. Add an entry to the `SUBJECTS` object in `index.html` with `label`, `subtitle`, `icon`, `questions: SUBJECT_Q`, and `filters` array
