export interface DestinyWeapon {
  hash: number;
  flavorText?: string;
  displayProperties: {
    name: string;
    description: string;
    icon: string;
    flavorText?: string;
    lore?: string;
  };
  itemTypeDisplayName: string;
  itemType: number;
  inventory: {
    tierTypeName: string;
    bucketTypeHash: number;
  };
  defaultDamageType: number;
}

export interface RawItemDef {
  hash: number;
  displayProperties?: {
    name: string;
    description?: string;
    icon?: string;
    flavorText?: string;
    lore?: string;
  };
  flavorText?: string;
  itemType?: number;
  itemTypeDisplayName?: string;
  inventory?: { tierTypeName?: string; bucketTypeHash?: number };
  defaultDamageType?: number;
  damageTypeHashes?: number[];
  ammoType?: number;
  equippingBlock?: { ammoType?: number; uniqueLabel?: string; equipmentSlotTypeHash?: number };
  plug?: { plugCategoryHash?: number; plugCategoryIdentifier?: string };
  itemCategoryHashes?: number[];
  sockets?: { socketEntries?: { singleItemHash?: number; reusablePlugItems?: { plugItemHash?: number }[] }[] };
  perks?: { perkHash?: number }[];
}

export type ItemDefMap = Record<string, RawItemDef>;

export interface GuessEntry {
  guess: string;
  hash?: number;
  correct: boolean;
  submitted: boolean;
}

// Weapon enriched with localized display name and accepted name aliases.
export type SearchableWeapon = DestinyWeapon & {
  displayName: string;
  aliases: string[];
};

export const STATS_VERSION = 1;

export interface GameStats {
  currentStreak: number;
  bestStreak: number;
  totalGames: number;
  totalGuesses: number;
}

export type GameStatus = 'loading' | 'playing' | 'won' | 'skipped' | 'lost';

export interface ConfettiPiece {
  id: number;
  left: string;
  color: string;
  duration: string;
  delay: string;
  scale: number;
}
