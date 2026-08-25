import type { DestinyWeapon, RawItemDef, ConfettiPiece } from '../types';

const CONFETTI_COLORS = ['#10b981', '#eab308', '#3b82f6', '#8b5cf6', '#f472b6', '#f5c542'];

export function toDestinyWeapon(item: RawItemDef): DestinyWeapon {
  return {
    hash: item.hash,
    flavorText: item.flavorText,
    displayProperties: {
      name: item.displayProperties?.name ?? '',
      description: item.displayProperties?.description ?? '',
      icon: item.displayProperties?.icon ?? '',
      flavorText: item.displayProperties?.flavorText,
      lore: item.displayProperties?.lore,
    },
    itemTypeDisplayName: item.itemTypeDisplayName ?? '',
    itemType: item.itemType ?? 0,
    inventory: {
      tierTypeName: item.inventory?.tierTypeName ?? '',
      bucketTypeHash: item.inventory?.bucketTypeHash ?? 0,
    },
    defaultDamageType: item.defaultDamageType ?? 0,
  };
}

export function pickRandomWeapon(weapons: DestinyWeapon[]): DestinyWeapon {
  const index = Math.floor(Math.random() * weapons.length);
  return weapons[index];
}

// Lowercase, strip diacritics and punctuation so "Fusil de Fusión" or
// "D.A.R.C.I." match freely ("darc i", "darci").
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.\s']/g, '');
}

export function getBrowserLang(): string {
  if (typeof navigator === 'undefined') return 'es';
  return (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
}

// Pick the Spanish manifest locale from the browser language: Spain keeps "es",
// any other Spanish variant (es-mx, es-ar, es-cl...) uses Latin American "es-mx".
export function resolveSpanishLocale(browserLang: string): string {
  const lower = String(browserLang).toLowerCase();
  if (lower === 'es' || lower.startsWith('es-es')) return 'es';
  return 'es-mx';
}

export function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    duration: `${3 + Math.random() * 2.5}s`,
    delay: `${Math.random() * 0.8}s`,
    scale: 0.7 + Math.random() * 0.8,
  }));
}

export function GuessHistoryList({ guesses }: { guesses: { guess: string; correct: boolean }[] }) {
  return (
    <ul className="space-y-2">
      {guesses.map((g, i) => (
        <li
          key={i}
          className={`px-3 py-2.5 rounded-lg text-sm flex items-center justify-between border ${
            g.correct ? 'bg-green-900/30 border-green-500/40 text-green-200' : 'bg-gray-800/50 border-gray-700 text-gray-300'
          }`}
        >
          <span>{g.guess}</span>
          <span className="font-bold">{g.correct ? '✓' : '✗'}</span>
        </li>
      ))}
    </ul>
  );
}
