'use client';

import { useEffect, useRef, useState } from 'react';

interface TypewriterProps {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseMs?: number;
}

export default function Typewriter({
  words,
  typingSpeed = 85,
  deletingSpeed = 40,
  pauseMs = 1400,
}: TypewriterProps) {
  const indexRef = useRef(0);
  const [text, setText] = useState(words[0] ?? '');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;
    const word = words[indexRef.current] ?? '';

    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting) {
      if (text === word) {
        timeout = setTimeout(() => setDeleting(true), pauseMs);
      } else {
        timeout = setTimeout(() => setText(word.slice(0, text.length + 1)), typingSpeed);
      }
    } else if (text === '') {
      indexRef.current = (indexRef.current + 1) % words.length;
      timeout = setTimeout(() => setDeleting(false), deletingSpeed);
    } else {
      timeout = setTimeout(() => setText(word.slice(0, text.length - 1)), deletingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, words, typingSpeed, deletingSpeed, pauseMs]);

  return (
    <span aria-live="off">
      {text}
      <span aria-hidden="true" className="inline-block w-0.5 h-4 align-middle ml-0.5 bg-gray-400 animate-blink" />
    </span>
  );
}
