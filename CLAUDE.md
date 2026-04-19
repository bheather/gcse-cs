# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-file OCR GCSE Computer Science revision quiz app. Everything lives in `index.html` — HTML structure, CSS styles, and JavaScript logic are all inline. There is no build step, no framework, and no dependencies; open `index.html` directly in a browser to run it.

## Architecture

`index.html` is structured in three sections:

1. **CSS** (`<style>`) — CSS custom properties for the colour scheme (green/red/amber states), plus styles for the lock screen, quiz screen, question cards, option buttons, and score screen.

2. **HTML** — Two top-level screens toggled by `display` style: `#lock-screen` (password gate) and `#quiz-screen` (the quiz UI). Dynamic content is injected into `#quiz-area`.

3. **JavaScript** (`<script>`) — Entirely vanilla JS. Key pieces:
   - `ALL_Q` — hardcoded array of question objects, each with `paper` (`'p1'`/`'p2'`), `topic`, `q`, `options` (array of 4), `answer` (letter A–D), `explanation`, and `memory_hook`.
   - `state` — single mutable object tracking current topic filter, shuffled session questions, current index, score, streak, and answer phase (`'unanswered'` → `'retry'` → `'correct'`/`'correct-retry'`/`'failed'`).
   - Screen functions: `showStart()`, `startQuiz()`, `showQuestion()`, `showScore()` — each replaces `#quiz-area` innerHTML entirely.
   - Answer logic: `selectAnswer(letter)` drives the two-attempt state machine; `showFeedback(type, q)` renders the result box and memory hook.

## Quiz behaviour

- Password is hardcoded as `connorironclad`.
- Sessions are 10 randomly shuffled questions drawn from the filtered pool.
- Each question allows 2 attempts. First correct = full credit + streak increment. Second correct = credit + streak. Both wrong = streak reset, correct answer revealed.
- Topic filter buttons (`'both'` / `'J277/01'` / `'J277/02'`) map to `paper` values `null` / `'p1'` / `'p2'` in `ALL_Q`.

## Adding questions

Add objects to the `ALL_Q` array following the existing schema:

```js
{
  paper: 'p1',           // 'p1' = Paper 1 (Systems), 'p2' = Paper 2 (Programming)
  topic: 'Topic Name',
  q: 'Question text',
  options: ['A. ...', 'B. ...', 'C. ...', 'D. ...'],
  answer: 'B',           // letter matching the correct option
  explanation: '...',
  memory_hook: '...'
}
```
