import { memo } from 'react';
import type { CSSProperties } from 'react';
import { MAX_ATTEMPTS, MIN_ROWS } from '../constants';

interface GuessEntry {
  guess: string;
  correct?: boolean;
  submitted?: boolean;
}

interface GuessGridProps {
  guesses: GuessEntry[];
  answerName: string;
  lang?: string;
}

type Feedback = 'correct' | 'present' | 'absent';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.\s']/g, '').toLowerCase();

// Wordle-style per-position scoring against the answer name.
function scoreGuess(guess: string, answer: string): Feedback[] {
  const g = norm(guess).split('');
  const ans = norm(answer).split('');
  const result: Feedback[] = Array(g.length).fill('absent');
  const used = Array(ans.length).fill(false);

  for (let i = 0; i < g.length; i++) {
    if (i < ans.length && g[i] === ans[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'correct') continue;
    const idx = ans.findIndex((ch, j) => !used[j] && ch === g[i]);
    if (idx >= 0) {
      result[i] = 'present';
      used[idx] = true;
    }
  }

  return result;
}

export default memo(function GuessGrid({ guesses, answerName, lang }: GuessGridProps) {
  const normalizedAnswer = norm(answerName || '');
  const computedMax = Math.max(
    normalizedAnswer.length,
    ...guesses.map(g => norm(g.guess || '').length),
    3
  );
  const maxLen = Math.min(computedMax, 30);

  const submittedGuesses = guesses.filter(g => !!g.submitted);
  const totalRows = Math.min(MAX_ATTEMPTS, Math.max(MIN_ROWS, submittedGuesses.length));

  const alpha = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const placeholderPool = alpha.filter(c => !normalizedAnswer.includes(c));

  const makePlaceholder = (rowIndex: number) => {
    const seed = Array.from(answerName || '').reduce((acc, ch) => acc + ch.charCodeAt(0), 7) + rowIndex * 13;
    return Array.from({ length: maxLen }, (_, i) => placeholderPool[(seed + i * 7) % placeholderPool.length]);
  };

  const rows: {
    letters: string[];
    feedback: Feedback[];
    submitted?: boolean;
    correct?: boolean;
  }[] = [];

  for (let i = 0; i < submittedGuesses.length; i++) {
    const g = submittedGuesses[i];
    const letters = norm(g.guess || '').split('');
    const feedback = scoreGuess(g.guess || '', answerName || '');
    rows.push({
      letters: letters.concat(Array(Math.max(0, maxLen - letters.length)).fill('')),
      feedback: feedback.concat(Array(Math.max(0, maxLen - feedback.length)).fill('absent')),
      submitted: true,
      correct: !!g.correct,
    });
  }

  for (let r = submittedGuesses.length; r < totalRows; r++) {
    rows.push({
      letters: makePlaceholder(r - submittedGuesses.length),
      feedback: Array(maxLen).fill('absent'),
      submitted: false,
    });
  }

  return (
    <div role="grid" aria-label={lang === 'es' ? 'Tus intentos' : 'Your Guesses'} className="guess-grid space-y-2 sm:space-y-3 max-w-full">
      {rows.map((rowData, row) => (
        <div
          role="row"
          key={row}
          className={`guess-row flex flex-col w-full ${
            rowData.correct ? 'guess-row-correct' : ''
          }`}
        >
          <div className="tiles min-w-0 py-1 mx-auto" style={{ '--count': maxLen } as CSSProperties}>
            {Array.from({ length: maxLen }).map((_, i) => {
              const ch = (rowData.letters[i] || '').toUpperCase();
              // A correct row is always fully green, even when the winning
              // guess was written in another language (alias), where
              // per-position scoring against answerName would not match.
              const fb = rowData.correct ? 'correct' : (rowData.feedback[i] || 'absent');
              const tileClass = rowData.submitted
                ? fb === 'correct'
                  ? 'tile-correct'
                  : fb === 'present'
                    ? 'tile-present'
                    : 'tile-absent'
                : 'tile-neutral';
              return (
                <div
                  role="gridcell"
                  aria-label={`${ch || 'empty'} - ${fb}`}
                  key={i}
                  className={`tile flex items-center justify-center rounded ${
                    rowData.submitted ? `tile-flip ${tileClass}` : `${tileClass} tile-pop`
                  }`}
                  style={{ animationDelay: `${(rowData.submitted ? i * 70 : i * 30)}ms` }}
                >
                  {ch}
                </div>
              );
            })}
          </div>
          <div className="min-h-5 flex items-center justify-center text-sm font-medium pt-1">
            {rowData.correct && <span className="text-green-300">✓ {lang === 'es' ? 'Correcto' : 'Correct'}</span>}
          </div>
        </div>
      ))}
    </div>
  );
});
