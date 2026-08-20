# Destiny 2 Guessing Game

A Wordle-style guessing game for Destiny 2 items powered by the Bungie API.

## How to Play

Guess the hidden Destiny 2 item in 5 attempts. Each wrong guess reveals hints about the item's name.

### Game Modes

- **Classic**: See the item's icon and guess by name (with autocomplete suggestions)
- **Words Only**: No image — guess from lore text and hint descriptions alone

### Categories

- **Exotic Weapons** — iconic guns from the Destiny universe
- **Exotic Armor** — hunter, titan, and warlock exotics
- **Legendary Perks** — weapon perks found on legendary gear

### Bilingual

Full English and Spanish support. The game detects your browser language automatically. Each session is locked to one language for consistent gameplay.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Next.js 16** + Turbopack
- **React 19** with hooks
- **Tailwind CSS 4**
- **Bungie API** — manifest data for all Destiny 2 items
- **IndexedDB** — client-side cache for API responses
- **localStorage** — persistent stats tracking

## Features

- Wordle-style tile grid with flip animations
- Category switching mid-session
- Hint system (stat reveals, slot type, rarity)
- Confetti on correct guess
- Keyboard shortcuts (H = hint, S = skip, / = focus input)
- Responsive design (mobile + desktop)
- Accessible (ARIA roles, keyboard navigation, screen reader support)
- CSP security headers

## License

MIT
