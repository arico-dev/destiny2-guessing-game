# Destiny 2 Guessing Game

A Wordle-style guessing game for Destiny 2, powered by live item data from the Bungie API. Test your Destiny knowledge by identifying exotic weapons, exotic armor, and legendary perks.

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

## Features

- Wordle-style tile grid with flip animations
- Single accent palette with light and dark mode
- Category switching mid-session
- Hint system (stat reveals, first letter, word count, name length)
- Confetti on correct guess
- Share result to clipboard
- Keyboard shortcuts (H = hint, S = skip, / = focus input)
- Responsive design (mobile + desktop)
- Accessible (ARIA roles, keyboard navigation, screen reader support)
- Lightweight currency: all item data cached client-side from the Destiny manifest
- Persistent stats tracking (streaks, total games, average guesses)

## Disclaimer

Destiny 2 is a trademark of Bungie, Inc. This project is a fan-made game and is not affiliated with, endorsed by, or sponsored by Bungie. All item names, images, and related content are the property of their respective owners and are used for informational purposes.

## License

MIT
