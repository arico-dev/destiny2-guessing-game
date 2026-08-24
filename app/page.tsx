"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Image from 'next/image';
import GuessGrid from './components/GuessGrid';
import Typewriter from './components/Typewriter';
import { LightbulbIcon, SkipForwardIcon, AlertTriangleIcon, Share2Icon, StarIcon } from './components/Icons';
import { getCached, setCached } from './lib/manifestCache';

interface DestinyWeapon {
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

interface RawItemDef {
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

type ItemDefMap = Record<string, RawItemDef>;

interface GuessEntry {
  guess: string;
  hash?: number;
  correct: boolean;
  submitted: boolean;
}

// Weapon enriched with localized display name and accepted name aliases.
type SearchableWeapon = DestinyWeapon & {
  displayName: string;
  aliases: string[];
};

const STATS_VERSION = 1;

interface GameStats {
  currentStreak: number;
  bestStreak: number;
  totalGames: number;
  totalGuesses: number;
}

type GameStatus = 'loading' | 'playing' | 'won' | 'skipped' | 'lost';

interface ConfettiPiece {
  id: number;
  left: string;
  color: string;
  duration: string;
  delay: string;
  scale: number;
}

const MAX_ATTEMPTS = 5;

const CONFETTI_COLORS = ['#10b981', '#eab308', '#3b82f6', '#8b5cf6', '#f472b6', '#f5c542'];

const L: Record<string, { en: string; es: string }> = {
  title: { en: 'Destiny 2 Guessing Game', es: 'Juego de Adivinar Destiny 2' },
  subtitlePrefix: { en: 'Can you name the', es: '¿Puedes adivinar' },
  subtitleWeapons: { en: 'exotic weapon', es: 'el arma exótica' },
  subtitleArmor: { en: 'exotic armor', es: 'la armadura exótica' },
  subtitlePerks: { en: 'perk', es: 'el perk' },
  classic: { en: 'Classic', es: 'Clásico' },
  wordsOnly: { en: 'Words Only', es: 'Solo Palabras' },
  wordsWeaponsDesc: { en: 'No image, only a description. 3 hints and {max} attempts.', es: 'Sin imagen, solo una descripción. 3 pistas y {max} intentos.' },
  wordsArmorDesc: { en: 'No image, only the armor lore. 3 hints and {max} attempts.', es: 'Sin imagen, solo la descripción de la armadura. 3 pistas y {max} intentos.' },
  wordsPerksDesc: { en: 'No image, only the perk description. 3 hints and {max} attempts.', es: 'Sin imagen, solo la descripción del perk. 3 pistas y {max} intentos.' },
  classicWeaponsDesc: { en: 'See the weapon and use hints to find its name.', es: 'Observa el arma y usa pistas para descubrir su nombre.' },
  classicArmorDesc: { en: 'See the armor and use hints to find its name.', es: 'Observa la armadura y usa pistas para descubrir su nombre.' },
  classicPerksDesc: { en: 'See the perk icon and use hints to find its name.', es: 'Observa el icono del perk y usa pistas para descubrir su nombre.' },
  startGame: { en: 'Start Game', es: 'Iniciar Juego' },
  loadingData: { en: 'Loading All Game Data...', es: 'Cargando datos del juego...' },
  loadingNote: { en: 'Fetching the Destiny 2 manifest. This may take a moment.', es: 'Descargando el manifest de Destiny 2. Esto puede tardar un momento.' },
  loadedWeapons: { en: '{n} Exotic Weapons loaded', es: '{n} armas exóticas cargadas' },
  loadedArmor: { en: '{n} Exotic Armor pieces loaded', es: '{n} armaduras exóticas cargadas' },
  loadedPerks: { en: '{n} Perks loaded', es: '{n} perks cargados' },
  catWeapons: { en: 'Weapons', es: 'Armas' },
  catArmor: { en: 'Armor', es: 'Armaduras' },
  catPerks: { en: 'Perks', es: 'Perks' },
  selectRandom: { en: 'Select a Random Weapon to Guess', es: 'Elegir arma aleatoria' },
  selectRandomArmor: { en: 'Select a Random Armor Piece to Guess', es: 'Elegir armadura aleatoria' },
  selectRandomPerks: { en: 'Select a Random Perk to Guess', es: 'Elegir perk aleatorio' },
  yourGuesses: { en: 'Your Guesses', es: 'Tus Intentos' },
  guessTheWeapon: { en: 'Guess the Weapon', es: 'Adivina el Arma' },
  guessTheArmor: { en: 'Guess the Armor', es: 'Adivina la Armadura' },
  guessThePerk: { en: 'Guess the Perk', es: 'Adivina el Perk' },
  revealHint: { en: 'Reveal Hint', es: 'Revelar Pista' },
  skip: { en: 'Skip', es: 'Omitir' },
  submit: { en: 'Submit', es: 'Enviar' },
  inputWordsPlaceholder: { en: 'Type the full weapon name...', es: 'Escribe el nombre completo del arma...' },
  inputWordsArmorPlaceholder: { en: 'Type the full armor name...', es: 'Escribe el nombre completo de la armadura...' },
  inputWordsPerkPlaceholder: { en: 'Type the full perk name...', es: 'Escribe el nombre completo del perk...' },
  inputClassicPlaceholder: { en: 'Type the weapon name...', es: 'Escribe el nombre del arma...' },
  inputClassicArmorPlaceholder: { en: 'Type the armor name...', es: 'Escribe el nombre de la armadura...' },
  inputClassicPerkPlaceholder: { en: 'Type the perk name...', es: 'Escribe el nombre del perk...' },
  youGotIt: { en: 'You Got It!', es: '¡Lo lograste!' },
  weaponSkipped: { en: 'Weapon Skipped', es: 'Arma omitida' },
  armorSkipped: { en: 'Armor Skipped', es: 'Armadura omitida' },
  perkSkipped: { en: 'Perk Skipped', es: 'Perk omitido' },
  youLost: { en: 'Out of Attempts', es: 'Sin intentos' },
  theWeaponWas: { en: 'The weapon was', es: 'El arma era' },
  theArmorWas: { en: 'The armor was', es: 'La armadura era' },
  thePerkWas: { en: 'The perk was', es: 'El perk era' },
  youTook: { en: 'You took', es: 'Tomaste' },
  playAgain: { en: 'Play Again', es: 'Jugar de nuevo' },
  currentStreak: { en: 'Current Streak', es: 'Racha actual' },
  bestStreak: { en: 'Best Streak', es: 'Mejor racha' },
  totalGames: { en: 'Total Games', es: 'Partidas totales' },
  avgGuesses: { en: 'Avg Guesses', es: 'Prom. intentos' },
  maxAttemptsReached: { en: `Maximum attempts (${MAX_ATTEMPTS}) reached. Start a new game.`, es: `Máximo de intentos (${MAX_ATTEMPTS}) alcanzado. Empieza una partida nueva.` },
  noExotics: { en: 'No items loaded for this category.', es: 'No se han cargado items para esta categoría.' },
  attempts: { en: 'Attempt {current}/{max}', es: 'Intento {current}/{max}' },
  wrongGuess: { en: 'Wrong guess. Try again!', es: 'Incorrecto. ¡Inténtalo de nuevo!' },
  noMatch: { en: 'No weapon matches that name', es: 'Ningún arma coincide con ese nombre' },
  correctGuess: { en: 'Correct!', es: '¡Correcto!' },
  hintFirstLetter: { en: 'First letter: {letter}', es: 'Primera letra: {letter}' },
  hintWordCount: { en: 'Word count: {n}', es: 'Número de palabras: {n}' },
  hintNameLength: { en: 'Name length: {n} characters', es: 'Longitud del nombre: {n} caracteres' },
  noMoreHints: { en: 'No more hints available', es: 'No quedan más pistas' },
  share: { en: 'Share Result', es: 'Compartir' },
  copied: { en: 'Result copied!', es: '¡Resultado copiado!' },
  copyFailed: { en: 'Could not copy the result', es: 'No se pudo copiar el resultado' },
  resultLine: { en: '{cat} · {mode} · {outcome} in {guesses}/{max} guesses', es: '{cat} · {mode} · {outcome} en {guesses}/{max} intentos' },
  guessed: { en: 'Guessed', es: 'Adivinado' },
  notGuessed: { en: 'Not guessed', es: 'No adivinado' },
  footerNote: { en: 'Made with Destiny 2 data from Bungie · Wordle-style guessing game', es: 'Hecho con datos de Destiny 2 de Bungie · Juego de adivinar estilo Wordle' },
};

// Known Bungie localization typos in the manifest (hash -> corrected name).
// E.g. the Spanish name of D.A.R.C.I. is "D.A.R.I.C." with the last two letters
// swapped, in both "es" and "es-mx". Overriding the display also keeps the
// corrected spelling from breaking guess validation.
const LOCALIZED_NAME_OVERRIDES: Record<number, string> = {
  3141979346: 'D.A.R.C.I.',
};

function toDestinyWeapon(item: RawItemDef): DestinyWeapon {
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

function pickRandomWeapon(weapons: DestinyWeapon[]): DestinyWeapon {
  const index = Math.floor(Math.random() * weapons.length);
  return weapons[index];
}

// Lowercase, strip diacritics and punctuation so "Fusil de Fusión" or
// "D.A.R.C.I." match freely ("darc i", "darci").
function normalizeForMatch(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.\s']/g, '');
}

function getBrowserLang(): string {
  if (typeof navigator === 'undefined') return 'es';
  return (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
}

// No-op subscription: the browser language is read once per mount and never
// changes during a session, so there is nothing to subscribe to.
const subscribeBrowserLang = () => () => {};

// Pick the Spanish manifest locale from the browser language: Spain keeps "es",
// any other Spanish variant (es-mx, es-ar, es-cl...) uses Latin American "es-mx".
function resolveSpanishLocale(browserLang: string): string {
  const lower = String(browserLang).toLowerCase();
  if (lower === 'es' || lower.startsWith('es-es')) return 'es';
  return 'es-mx';
}

function GuessHistoryList({ guesses }: { guesses: { guess: string; correct: boolean }[] }) {
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

function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    duration: `${3 + Math.random() * 2.5}s`,
    delay: `${Math.random() * 0.8}s`,
    scale: 0.7 + Math.random() * 0.8,
  }));
}

export default function Home() {
  const [itemDefs, setItemDefs] = useState<ItemDefMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<DestinyWeapon | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('loading');
  const [gameMode, setGameMode] = useState<'classic' | 'words'>('classic');
  const [category, setCategory] = useState<'weapons' | 'armor' | 'perks'>('weapons');
  const [currentGuess, setCurrentGuess] = useState('');
  const [guessHistory, setGuessHistory] = useState<GuessEntry[]>([]);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [stats, setStats] = useState<GameStats>(() => {
    const defaults: GameStats = { currentStreak: 0, bestStreak: 0, totalGames: 0, totalGuesses: 0 };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('d2GameStats');
      if (!saved) return defaults;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return defaults;
      if (parsed.v !== STATS_VERSION) { localStorage.removeItem('d2GameStats'); return defaults; }
      return {
        currentStreak: Number.isFinite(parsed.currentStreak) ? parsed.currentStreak : 0,
        bestStreak: Number.isFinite(parsed.bestStreak) ? parsed.bestStreak : 0,
        totalGames: Number.isFinite(parsed.totalGames) ? parsed.totalGames : 0,
        totalGuesses: Number.isFinite(parsed.totalGuesses) ? parsed.totalGuesses : 0,
      };
    } catch {
      return defaults;
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  // Browser language as an external snapshot: the server snapshot stays 'es'
  // so prerendered markup matches, then the client re-renders with the real
  // value after hydration. `langOverride` is only set from user handlers, so
  // the active language/locale are plain render-time derivations.
  const browserLang = useSyncExternalStore(subscribeBrowserLang, getBrowserLang, () => 'es');
  const [langOverride, setLangOverride] = useState<'en' | 'es' | null>(null);
  const [prevItemDefs, setPrevItemDefs] = useState<ItemDefMap | null>(null);
  const [enItemDefs, setEnItemDefs] = useState<ItemDefMap | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lang: 'en' | 'es' = langOverride ?? (browserLang.toLowerCase().slice(0, 2) === 'es' ? 'es' : 'en');
  const locale = lang === 'en' ? 'en' : resolveSpanishLocale(browserLang);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastExiting(false);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastExiting(true);
      setTimeout(() => { setToast(null); setToastExiting(false); }, 200);
    }, 4000);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => setIsShaking(false), 500);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const entry = L[key];
    if (!entry) return key;
    let s = lang === 'en' ? entry.en : entry.es;
    if (vars) {
      Object.keys(vars).forEach(k => {
        s = s.replace(`{${k}}`, String(vars[k]));
      });
    }
    return s;
  }, [lang]);

  // Picks the translation key for the current category.
  const catKey = useCallback((weapons: string, armor: string, perks: string) =>
    category === 'armor' ? armor : category === 'perks' ? perks : weapons,
  [category]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Autofocus the guess input whenever a new round starts (new answer hash).
  // The input mounts with the playing state, so focus from an effect.
  const answerHash = answer?.hash;
  useEffect(() => {
    if (gameStatus === 'playing' && answerHash != null) {
      searchInputRef.current?.focus();
    }
  }, [gameStatus, answerHash]);

  const loreText = useMemo(() => {
    if (!answer) return null;

    let lore: string | null = null;
    if (prevItemDefs && answer.hash) {
      const localizedVersion = Object.values(prevItemDefs).find((it) => Number(it.hash) === Number(answer.hash));
      if (localizedVersion) {
        lore = localizedVersion.flavorText ||
          localizedVersion.displayProperties?.flavorText ||
          localizedVersion.displayProperties?.lore ||
          localizedVersion.displayProperties?.description ||
          null;
      }
    }

    if (!lore) {
      lore = answer.flavorText ||
        answer.displayProperties?.flavorText ||
        answer.displayProperties?.lore ||
        answer.displayProperties?.description ||
        null;
    }

    if (!lore && enItemDefs && answer.hash) {
      const enVersion = Object.values(enItemDefs).find((it) => Number(it.hash) === Number(answer.hash));
      if (enVersion) {
        lore = enVersion.flavorText ||
          enVersion.displayProperties?.flavorText ||
          enVersion.displayProperties?.lore ||
          enVersion.displayProperties?.description ||
          null;
      }
    }

    return lore;
  }, [answer, prevItemDefs, enItemDefs]);

  const exoticWeapons = useMemo((): DestinyWeapon[] => {
    if (!itemDefs) return [];
    const byName = new Map<string, RawItemDef>();
    for (const item of Object.values(itemDefs)) {
      if (
        item.itemType !== 3 ||
        item.inventory?.tierTypeName !== 'Exotic' ||
        !item.displayProperties?.name ||
        item.displayProperties.name.includes("Invitation from the Emperor")
      ) continue;
      const name = item.displayProperties.name;
      const current = byName.get(name);
      if (!current || (!current.displayProperties?.icon && item.displayProperties?.icon)) {
        byName.set(name, item);
      }
    }
    return Array.from(byName.values()).map(toDestinyWeapon);
  }, [itemDefs]);

  const exoticArmor = useMemo((): DestinyWeapon[] => {
    if (!itemDefs) return [];
    const byName = new Map<string, RawItemDef>();
    for (const item of Object.values(itemDefs)) {
      if (
        item.itemType !== 2 ||
        item.inventory?.tierTypeName !== 'Exotic' ||
        !item.displayProperties?.name
      ) continue;
      const name = item.displayProperties.name;
      const current = byName.get(name);
      if (!current || (!current.displayProperties?.icon && item.displayProperties?.icon)) {
        byName.set(name, item);
      }
    }
    return Array.from(byName.values()).map(toDestinyWeapon);
  }, [itemDefs]);

  // Hashes of perks/plugs that can be selected on legendary weapons. A perk is only
  // part of the guessing pool if it can actually roll on a legendary weapon, which
  // keeps exotic-only and catalyst-granted perks (Shiver Quiver, Toxic Overload, ...)
  // out of the pool.
  const legendaryPerkHashes = useMemo((): Set<number> => {
    if (!itemDefs) return new Set();
    const used = new Set<number>();
    for (const item of Object.values(itemDefs)) {
      if (item.itemType !== 3 || item.inventory?.tierTypeName !== 'Legendary') continue;
      for (const s of item.sockets?.socketEntries || []) {
        if (s.singleItemHash) used.add(Number(s.singleItemHash));
        for (const r of s.reusablePlugItems || []) used.add(Number(r.plugItemHash));
      }
      for (const p of item.perks || []) used.add(Number(p.perkHash));
    }
    return used;
  }, [itemDefs]);

  const exoticPerks = useMemo((): DestinyWeapon[] => {
    if (!itemDefs) return [];
    const byName = new Map<string, RawItemDef>();
    for (const item of Object.values(itemDefs)) {
      if (
        item.itemType !== 19 ||
        !item.displayProperties?.name ||
        !item.displayProperties?.icon ||
        (item.itemCategoryHashes || []).includes(54) ||
        item.plug?.plugCategoryIdentifier !== 'frames'
      ) continue;
      const name = item.displayProperties.name;
      const current = byName.get(name);
      const candRef = legendaryPerkHashes.has(Number(item.hash));
      const curRef = current ? legendaryPerkHashes.has(Number(current.hash)) : false;
      if (!current || (candRef && !curRef)) {
        byName.set(name, item);
      }
    }
    const out: DestinyWeapon[] = [];
    for (const item of byName.values()) {
      if (legendaryPerkHashes.has(Number(item.hash))) {
        out.push(toDestinyWeapon(item));
      }
    }
    return out;
  }, [itemDefs, legendaryPerkHashes]);

  const categoryPool = useMemo(
    () => (category === 'armor' ? exoticArmor : category === 'perks' ? exoticPerks : exoticWeapons),
    [category, exoticArmor, exoticPerks, exoticWeapons]
  );

  // hash -> corrected localized display name (e.g. Spanish), built from the
  // localized manifest with Bungie typos overridden.
  const localizedNames = useMemo(() => {
    const map = new Map<number, string>();
    if (prevItemDefs) {
      Object.values(prevItemDefs).forEach(it => {
        const n = it.displayProperties?.name;
        if (n) map.set(Number(it.hash), LOCALIZED_NAME_OVERRIDES[Number(it.hash)] || n);
      });
    }
    return map;
  }, [prevItemDefs]);

  // hash -> raw localized name as shipped by Bungie (no overrides), kept only
  // so both spellings (corrected and manifest) still validate a guess.
  const localizedRawNames = useMemo(() => {
    const map = new Map<number, string>();
    if (prevItemDefs) {
      Object.values(prevItemDefs).forEach(it => {
        const n = it.displayProperties?.name;
        if (n) map.set(Number(it.hash), n);
      });
    }
    return map;
  }, [prevItemDefs]);

  // Weapons enriched with the localized name shown in the current language and
  // every accepted name (used to validate guesses written in another language).
  const searchWeapons = useMemo((): SearchableWeapon[] => {
    return categoryPool.map(w => {
      const locName = localizedNames.get(Number(w.hash));
      const rawLocName = localizedRawNames.get(Number(w.hash));
      return {
        ...w,
        displayName: locName || w.displayProperties.name,
        aliases: Array.from(new Set([
          ...(locName && locName !== w.displayProperties.name ? [locName] : []),
          ...(rawLocName && rawLocName !== locName && rawLocName !== w.displayProperties.name ? [rawLocName] : []),
        ])),
      };
    });
  }, [categoryPool, localizedNames, localizedRawNames]);

  // Name shown as the answer (hints, grid feedback, reveal) in the active language.
  const displayName = useMemo(() => {
    if (!answer) return '';
    const locName = locale.startsWith('es') ? localizedNames.get(Number(answer.hash)) : undefined;
    return locName || answer.displayProperties.name;
  }, [answer, locale, localizedNames]);

  const fetchAllDefinitions = useCallback(async (localeKey: string, preserveHash: number | null = null) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const prevDefs = itemDefs;

    try {
      const manifestResponse = await fetch('/api/destiny/manifest', { signal: controller.signal });
      const manifestData = await manifestResponse.json();
      if (!manifestResponse.ok) throw new Error(manifestData.error || 'Failed to fetch manifest');

      const availableLocales = Object.keys(manifestData.Response?.jsonWorldComponentContentPaths || {});

      let itemDefsPath = manifestData.Response?.jsonWorldComponentContentPaths?.[localeKey]?.DestinyInventoryItemDefinition;

      if (!itemDefsPath && localeKey.startsWith('es')) {
        const esVariants = availableLocales.filter((l: string) => l.startsWith('es'));
        if (esVariants.length > 0) {
          itemDefsPath = manifestData.Response?.jsonWorldComponentContentPaths?.[esVariants[0]]?.DestinyInventoryItemDefinition;
        }
      }

      const enPath = manifestData.Response?.jsonWorldComponentContentPaths?.en?.DestinyInventoryItemDefinition;

      if (!itemDefsPath && !enPath) throw new Error("Could not find item definition paths in the manifest.");

      let localizedData: ItemDefMap | null = null;
      if (itemDefsPath) {
        const localCacheKey = `items:${itemDefsPath}`;
        try {
          localizedData = await getCached<ItemDefMap | null>(localCacheKey);
        } catch {
          localizedData = null;
        }
        if (!localizedData && !controller.signal.aborted) {
          try {
            const localResponse = await fetch(`https://www.bungie.net${itemDefsPath}`, { signal: controller.signal });
            localizedData = await localResponse.json();
            setCached(localCacheKey, localizedData);
          } catch {
            // localized fetch failed
          }
        }
      }

      let enData: ItemDefMap | null = null;
      if (enPath && !controller.signal.aborted) {
        const enCacheKey = `items:${enPath}`;
        try {
          enData = await getCached<ItemDefMap | null>(enCacheKey);
        } catch {
          enData = null;
        }
        if (!enData) {
          try {
            const enResp = await fetch(`https://www.bungie.net${enPath}`, { signal: controller.signal });
            enData = await enResp.json();
            setCached(enCacheKey, enData);
          } catch {
            // EN fetch failed
          }
        }
        if (enData) setEnItemDefs(enData);
      }

      const finalData = enData || localizedData;

      if (localizedData && localizedData !== enData) {
        setPrevItemDefs(localizedData);
      }

      if (!finalData) throw new Error("No item definition data available.");

      setItemDefs(finalData);

      if (preserveHash) {
        const found = Object.values(finalData).find((it) => Number(it.hash) === Number(preserveHash));

        if (found) {
          setAnswer(toDestinyWeapon(found));
          setGameStatus('playing');
        } else {
          setAnswer(null);
        }
      } else {
        setAnswer(null);
      }

    } catch (err) {
      if (controller.signal.aborted) return;
      if (prevDefs) {
        setItemDefs(prevDefs);
      } else {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [itemDefs]);

  // When language changes, re-fetch localized definitions preserving the current answer if any
  const changeLang = (next: 'en' | 'es') => {
    if (next === lang) return;
    setLangOverride(next);
    if (itemDefs) {
      fetchAllDefinitions(next === 'en' ? 'en' : resolveSpanishLocale(getBrowserLang()), answer?.hash || null);
    }
  };

  // Switching category resets any ended game back to the setup screen.
  const changeCategory = (next: 'weapons' | 'armor' | 'perks') => {
    if (next === category) return;
    setCategory(next);
    if (answer) {
      setAnswer(null);
      setGuessHistory([]);
      setCurrentGuess('');
      setHintsUsed(0);
      setRevealedHints([]);
      setConfettiPieces([]);
      setGameStatus('loading');
    }
  };

  const selectRandomWeapon = () => {
    if (categoryPool.length === 0) {
      setError(t('noExotics'));
      return;
    }
    setAnswer(pickRandomWeapon(categoryPool));
    setGameStatus('playing');
    setGuessHistory([]);
    setCurrentGuess('');
    setHintsUsed(0);
    setRevealedHints([]);
    setConfettiPieces([]);
    setError(null);
  };

  const getHint = useCallback(() => {
    if (!answer || hintsUsed >= 3) {
      if (hintsUsed >= 3) showToast(t('noMoreHints'), 'info');
      return;
    }

    const name = displayName || answer.displayProperties.name;
    const hints: string[] = [];
    if (hintsUsed === 0) {
      hints.push(t('hintFirstLetter', { letter: name.charAt(0).toUpperCase() }));
    } else if (hintsUsed === 1) {
      hints.push(t('hintWordCount', { n: name.split(' ').length }));
    } else if (hintsUsed === 2) {
      hints.push(t('hintNameLength', { n: name.replace(/\s+/g, '').length }));
    }

    setRevealedHints(hints);
    setHintsUsed(hintsUsed + 1);
  }, [answer, displayName, hintsUsed, t, showToast]);

  const finishGame = useCallback((status: GameStatus, guesses: GuessEntry[]) => {
    setGameStatus(status);
    const won = status === 'won';
    const newStreak = won ? stats.currentStreak + 1 : 0;
    const newStats = {
      ...stats,
      totalGames: stats.totalGames + 1,
      totalGuesses: stats.totalGuesses + guesses.length,
      currentStreak: newStreak,
      bestStreak: Math.max(stats.bestStreak, newStreak),
    };
    setStats(newStats);
    localStorage.setItem('d2GameStats', JSON.stringify({ v: STATS_VERSION, ...newStats }));
    setConfettiPieces(won ? makeConfetti() : []);
  }, [stats]);

  const skipWeapon = useCallback(() => {
    if (!answer) return;
    finishGame('skipped', guessHistory);
  }, [answer, guessHistory, finishGame]);

  // Global keyboard shortcuts. Declared after getHint/skipWeapon so the
  // handlers it closes over already exist.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (gameStatus !== 'playing' || !answer) return;
      if (e.key === 'h' || e.key === 'H') { e.preventDefault(); getHint(); }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); skipWeapon(); }
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, answer, getHint, skipWeapon]);

  const handleSubmitGuess = (guessedWeapon: SearchableWeapon) => {
    if (!answer || isSubmitting) return;
    setIsSubmitting(true);

    const submittedCount = guessHistory.filter(g => g.submitted).length;
    if (submittedCount >= MAX_ATTEMPTS) {
      showToast(t('maxAttemptsReached'), 'error');
      setIsSubmitting(false);
      return;
    }

    const isCorrect = guessedWeapon.hash === answer.hash;
    const entry: GuessEntry = { guess: guessedWeapon.displayName, hash: guessedWeapon.hash, correct: isCorrect, submitted: true };
    const newGuessHistory = [...guessHistory, entry];
    setGuessHistory(newGuessHistory);
    setCurrentGuess('');
    searchInputRef.current?.focus();

    if (isCorrect) {
      finishGame('won', newGuessHistory);
      setIsSubmitting(false);
      return;
    }

    showToast(t('wrongGuess'), 'error');
    triggerShake();

    if (submittedCount + 1 >= MAX_ATTEMPTS) {
      finishGame('lost', newGuessHistory);
    }
    setIsSubmitting(false);
  };

  const handleGuessInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentGuess(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (gameMode === 'words') {
      if (!answer) { setIsSubmitting(false); return; }
      const submittedCount = guessHistory.filter(g => g.submitted).length;
      if (submittedCount >= MAX_ATTEMPTS) {
        showToast(t('maxAttemptsReached'), 'error');
        setIsSubmitting(false);
        return;
      }
      const guessText = currentGuess.trim();
      if (!guessText) { setIsSubmitting(false); return; }
      const answerWeapon = searchWeapons.find(w => w.hash === answer.hash);
      // Always accept the English name, plus the localized name/aliases, so
      // spelling variants (e.g. "D.A.R.C.I" vs the manifest's ES "D.A.R.I.C")
      // never fail a correct guess.
      const isEnglish = !locale.startsWith('es');
      const acceptedNames = Array.from(new Set([
        ...(isEnglish ? [answer.displayProperties.name] : []),
        ...(answerWeapon ? [answerWeapon.displayName, ...answerWeapon.aliases] : []),
      ]));
      const isCorrect = acceptedNames.some(n => normalizeForMatch(guessText) === normalizeForMatch(n));
      const newEntry: GuessEntry = { guess: guessText, correct: isCorrect, submitted: true };
      const newGuessHistory = [...guessHistory, newEntry];
      setGuessHistory(newGuessHistory);
      setCurrentGuess('');

      if (isCorrect) {
        finishGame('won', newGuessHistory);
        setIsSubmitting(false);
        return;
      }

      showToast(t('wrongGuess'), 'error');
      triggerShake();

      if (submittedCount + 1 >= MAX_ATTEMPTS) {
        finishGame('lost', newGuessHistory);
      }
      setIsSubmitting(false);
      return;
    }

    const guessText = currentGuess.trim();
    if (!guessText || !answer) { setIsSubmitting(false); return; }
    const q = normalizeForMatch(guessText);
    const isEnglish = !locale.startsWith('es');
    const matched = searchWeapons.find(w =>
      normalizeForMatch(w.displayName) === q ||
      (isEnglish && normalizeForMatch(w.displayProperties.name) === q) ||
      w.aliases.some(a => normalizeForMatch(a) === q)
    );
    if (!matched) {
      showToast(t('noMatch'), 'error');
      triggerShake();
      setIsSubmitting(false);
      return;
    }
    // A correct guess must match the answer itself. Pools can contain several
    // items sharing the same name (e.g. exotic armor variants), and the first
    // match may not be the answer's hash.
    const answerWeapon = searchWeapons.find(w => w.hash === answer.hash);
    const acceptedNames = Array.from(new Set([
      ...(isEnglish ? [answer.displayProperties.name] : []),
      ...(answerWeapon ? [answerWeapon.displayName, ...answerWeapon.aliases] : []),
    ]));
    const isCorrect = acceptedNames.some(n => normalizeForMatch(n) === q);
    handleSubmitGuess(isCorrect && answerWeapon ? answerWeapon : matched);
  };

  const startNewGame = () => {
    setIsSubmitting(false);
    selectRandomWeapon();
  };

  const submittedCount = guessHistory.filter(g => g.submitted).length;

  const shareResults = async () => {
    if (!answer) return;
    const mode = gameMode === 'words' ? t('wordsOnly') : t('classic');
    const outcome = gameStatus === 'won' ? t('guessed') : t('notGuessed');
    const cat = `[${t(catKey('catWeapons', 'catArmor', 'catPerks'))}]`;
    const line1 = t('resultLine', { cat, mode, outcome, guesses: submittedCount, max: MAX_ATTEMPTS });
    const grid = guessHistory
      .filter(g => g.submitted)
      .map(g => (g.correct ? '🟩' : '⬛'))
      .join(' ');
    const shareText = `${line1}\n${grid}`;
    try {
      await navigator.clipboard.writeText(shareText);
      showToast(t('copied'), 'success');
    } catch {
      showToast(t('copyFailed'), 'error');
    }
  };

  const guessRows = guessHistory.map((g) => ({
    guess: g.guess,
    correct: g.correct,
    submitted: g.submitted,
  }));

  return (
    <main className="app-container flex flex-col items-center pb-20">
      <a href="#game-area" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        {lang === 'es' ? 'Saltar al juego' : 'Skip to game'}
      </a>
      {confettiPieces.map(c => (
        <span
          key={c.id}
          aria-hidden
          className="confetti-piece"
          style={{
            left: c.left,
            background: c.color,
            width: `${8 * c.scale}px`,
            height: `${14 * c.scale}px`,
            animationDuration: c.duration,
            animationDelay: c.delay,
          }}
        />
      ))}

      <div className="w-full max-w-5xl">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8 mt-4 sm:mt-8 animate-fade-up">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-blue-400 via-purple-400 to-yellow-300 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-400">
            {t('subtitlePrefix')}{' '}
            <Typewriter key={lang} words={[`${t('subtitleWeapons')}?`, `${t('subtitleArmor')}?`, `${t('subtitlePerks')}?`]} />
          </p>
        </header>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 animate-fade-up">
          <div className="segmented" role="group" aria-label="Game mode">
            <button
              type="button"
              onClick={() => setGameMode('classic')}
              disabled={!!answer && gameStatus === 'playing'}
              className={gameMode === 'classic' ? 'active' : ''}
            >
              {t('classic')}
            </button>
            <button
              type="button"
              onClick={() => setGameMode('words')}
              disabled={!!answer && gameStatus === 'playing'}
              className={gameMode === 'words' ? 'active' : ''}
            >
              {t('wordsOnly')}
            </button>
          </div>

          <div className="segmented" role="group" aria-label="Language">
            <button type="button" onClick={() => changeLang('en')} className={lang === 'en' ? 'active' : ''}>EN</button>
            <button type="button" onClick={() => changeLang('es')} className={lang === 'es' ? 'active' : ''}>ES</button>
          </div>

          {!(answer && gameStatus === 'playing') && (
            <div className="segmented" role="group" aria-label="Category">
              <button type="button" onClick={() => changeCategory('weapons')} className={category === 'weapons' ? 'active' : ''}>
                {t('catWeapons')}
              </button>
              <button type="button" onClick={() => changeCategory('armor')} className={category === 'armor' ? 'active' : ''}>
                {t('catArmor')}
              </button>
              <button type="button" onClick={() => changeCategory('perks')} className={category === 'perks' ? 'active' : ''}>
                {t('catPerks')}
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-sm text-gray-400 mb-6 animate-fade-up">
          {t(gameMode === 'words'
            ? (category === 'armor' ? 'wordsArmorDesc' : category === 'perks' ? 'wordsPerksDesc' : 'wordsWeaponsDesc')
            : (category === 'armor' ? 'classicArmorDesc' : category === 'perks' ? 'classicPerksDesc' : 'classicWeaponsDesc'),
            { max: MAX_ATTEMPTS })}
        </p>

        <div className="w-full max-w-2xl mx-auto">
          {/* Toast */}
          {toast && (
            <div
              role={toast.type === 'error' ? 'alert' : 'status'}
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              className={`${toastExiting ? 'animate-float-out' : 'animate-float-in'} mb-4 px-4 py-3 rounded-lg border text-sm font-medium cursor-pointer ${
                toast.type === 'error'
                  ? 'bg-red-900/40 border-red-500/40 text-red-200'
                  : toast.type === 'success'
                    ? 'bg-green-900/40 border-green-500/40 text-green-200'
                    : 'bg-blue-900/40 border-blue-500/40 text-blue-200'
              }`}
              onClick={() => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); setToastExiting(true); setTimeout(() => { setToast(null); setToastExiting(false); }, 200); }}
            >
              {toast.message}
            </div>
          )}

          {/* Persistent error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg border border-red-500/40 bg-red-900/40 text-red-200 text-sm flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 flex-shrink-0">
                <AlertTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{error}</span>
              </span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-300 hover:text-white text-lg leading-none p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {!itemDefs && (
            <div className="text-center animate-fade-up">
              <button
                onClick={() => fetchAllDefinitions(locale)}
                disabled={isLoading}
                className="btn btn-primary text-lg px-8 py-4"
              >
                {isLoading ? t('loadingData') : t('startGame')}
              </button>
              {isLoading && (
                <div className="mt-6 space-y-4 max-w-sm mx-auto">
                  <div className="h-4 bg-gray-700/60 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-700/60 rounded animate-pulse"></div>
                  <div className="h-32 bg-gray-700/60 rounded animate-pulse"></div>
                </div>
              )}
              <p className="text-sm text-gray-400 mt-2">{t('loadingNote')}</p>
            </div>
          )}

          {itemDefs && categoryPool.length > 0 && !answer && (
            <div className="card mt-2 p-6 text-center animate-fade-up">
              <p className="text-2xl font-bold text-yellow-300">{categoryPool.length}</p>
              <p className="text-gray-400 mb-5">
                {t(category === 'armor' ? 'loadedArmor' : category === 'perks' ? 'loadedPerks' : 'loadedWeapons', { n: categoryPool.length })}
              </p>
              <button
                onClick={selectRandomWeapon}
                disabled={isLoading || categoryPool.length === 0}
                className="btn btn-gold text-lg px-8 py-3"
              >
                {t(catKey('selectRandom', 'selectRandomArmor', 'selectRandomPerks'))}
              </button>
            </div>
          )}

          {answer && gameStatus === 'playing' && (
            <div id="game-area" className="mt-4 space-y-8 animate-fade-up">
              {/* Guess grid */}
              {guessHistory.length > 0 && (
                <div className="card p-5 sm:p-6">
                  <h3 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">{t('yourGuesses')}</h3>
                  {gameMode === 'words' ? (
                    <GuessGrid
                      guesses={guessRows}
                      answerName={displayName}
                      lang={lang}
                    />
                  ) : (
                    <GuessHistoryList guesses={guessRows} />
                  )}
                </div>
              )}

              {/* Guess panel */}
              <div className="card p-6 sm:p-8 text-center border-t-2 border-t-yellow-600">
                <h2 className="text-xl font-semibold mb-5 text-yellow-400">{t(catKey('guessTheWeapon', 'guessTheArmor', 'guessThePerk'))}</h2>

                {gameMode === 'classic' && answer.displayProperties.icon && (
                  <Image
                    src={`https://www.bungie.net${answer.displayProperties.icon}`}
                    alt={displayName || t(catKey('guessTheWeapon', 'guessTheArmor', 'guessThePerk'))}
                    width={128}
                    height={128}
                    priority
                    className="h-32 w-32 mx-auto mb-5 object-contain animate-pop-in drop-shadow-[0_0_20px_rgba(245,197,66,0.25)]"
                  />
                )}

                {gameMode === 'words' && loreText && (
                  <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-4 mb-5 text-left min-h-24">
                    <p className="text-gray-300 text-sm leading-relaxed italic border-l-2 border-yellow-500/50 pl-3">
                      {loreText}
                    </p>
                  </div>
                )}

                {revealedHints.length > 0 && (
                  <div className="bg-blue-900/30 border-l-4 border-blue-400 rounded-r-lg p-3 mb-5 text-left animate-fade-up">
                    {revealedHints.map((hint, idx) => (
                      <p key={idx} className="text-blue-300 text-sm mb-1 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-200 flex-shrink-0">
                          <StarIcon className="h-3 w-3" />
                        </span>
                        {hint}
                      </p>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-400 mb-3" role="status">
                  {t('attempts', { current: submittedCount, max: MAX_ATTEMPTS })}
                </p>
                <form onSubmit={handleFormSubmit} className="relative space-y-4">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={currentGuess}
                    onChange={handleGuessInputChange}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={100}
                    aria-label={t(catKey('guessTheWeapon', 'guessTheArmor', 'guessThePerk'))}
                    list={gameMode === 'classic' ? 'weapon-suggestions' : undefined}
                    placeholder={gameMode === 'words'
                      ? t(catKey('inputWordsPlaceholder', 'inputWordsArmorPlaceholder', 'inputWordsPerkPlaceholder'))
                      : t(catKey('inputClassicPlaceholder', 'inputClassicArmorPlaceholder', 'inputClassicPerkPlaceholder'))}
                    className={`w-full px-4 py-3 rounded-lg bg-gray-800/70 text-sm text-white placeholder-gray-500 border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isShaking ? 'border-red-500 animate-shake' : 'border-gray-700 focus:border-blue-500'
                    }`}
                  />
                  {gameMode === 'classic' && (
                    <datalist id="weapon-suggestions">
                      {searchWeapons.map(w => (
                        <option key={w.hash} value={w.displayName} />
                      ))}
                    </datalist>
                  )}
                  <div className="flex gap-2 sm:gap-3 pt-2">
                    <button
                      type="button"
                      onClick={getHint}
                      disabled={hintsUsed >= 3}
                      className="btn btn-ghost flex-1 text-xs sm:text-sm py-2 sm:py-2.5"
                      title={hintsUsed >= 3 ? t('noMoreHints') : `${t('revealHint')} (${hintsUsed}/3)`}
                    >
                      <LightbulbIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t('revealHint')} ({hintsUsed}/3)
                    </button>
                    <button
                      type="button"
                      onClick={skipWeapon}
                      className="btn btn-ghost flex-1 text-xs sm:text-sm py-2 sm:py-2.5"
                    >
                      <SkipForwardIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t('skip')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1 text-xs sm:text-sm py-2 sm:py-2.5"
                      disabled={!currentGuess.trim()}
                    >
                      {t('submit')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {answer && (gameStatus === 'won' || gameStatus === 'skipped' || gameStatus === 'lost') && (
            <div className={`card mt-4 p-4 sm:p-6 md:p-8 text-center border-2 animate-pop-in ${
              gameStatus === 'won'
                ? 'border-green-500/60'
                : 'border-orange-500/60'
            }`}>
              <div className="mb-4 flex items-center justify-center">
                {gameStatus === 'won'
                  ? <Image
                      src="/cayde6-thumbs-up.png"
                      alt="Cayde approves"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain drop-shadow-[0_0_14px_rgba(255,200,50,0.6)]"
                    />
                  : <Image
                      src="https://www.bungie.net/common/destiny2_content/icons/e22e9819036ebbf74f682ab8f96e6e40.png"
                      alt="Wipe"
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    />}
              </div>
              <h2 className={`text-3xl font-bold mb-3 ${
                gameStatus === 'won' ? 'text-green-400' : 'text-orange-400'
              }`}>
                {gameStatus === 'won' ? t('youGotIt') : (gameStatus === 'skipped' ? t(catKey('weaponSkipped', 'armorSkipped', 'perkSkipped')) : t('youLost'))}
              </h2>
              {gameMode === 'words' && answer.displayProperties.icon && (
                <Image
                  src={`https://www.bungie.net${answer.displayProperties.icon}`}
                  alt={displayName}
                  width={128}
                  height={128}
                  priority
                  className="h-32 w-32 mx-auto mb-4 object-contain drop-shadow-[0_0_20px_rgba(245,197,66,0.25)]"
                />
              )}
              <p className="text-lg mb-2 text-gray-200">
                {t(catKey('theWeaponWas', 'theArmorWas', 'thePerkWas'))}{' '}
                <span className={`font-bold ${gameStatus === 'won' ? 'text-green-300' : 'text-orange-300'}`}>
                  {displayName}
                </span>
              </p>
              {gameStatus !== 'skipped' && (
                <p className="text-gray-400 mb-8">
                  {t('youTook')}{' '}
                  <span className="font-bold text-white">{submittedCount}</span>{' '}
                  {lang === 'en' ? `guess${submittedCount !== 1 ? 'es' : ''}` : `intento${submittedCount !== 1 ? 's' : ''}`}.
                </p>
              )}

              {gameStatus !== 'skipped' && submittedCount > 0 && (
                <div className="mb-8">
                  {gameMode === 'words' ? (
                    <GuessGrid guesses={guessRows} answerName={displayName} lang={lang} />
                  ) : (
                    <div className="max-w-md mx-auto">
                      <GuessHistoryList guesses={guessRows} />
                    </div>
                  )}
                </div>
              )}

              <div className="mb-8 p-4 bg-gray-800/60 rounded-xl grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">{t('currentStreak')}</p>
                  <p className="text-2xl font-bold text-white">{stats.currentStreak}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">{t('bestStreak')}</p>
                  <p className="text-2xl font-bold text-white">{stats.bestStreak}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">{t('totalGames')}</p>
                  <p className="text-2xl font-bold text-white">{stats.totalGames}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">{t('avgGuesses')}</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalGames > 0 ? (stats.totalGuesses / stats.totalGames).toFixed(1) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <button onClick={startNewGame} className="btn btn-gold text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 w-full sm:w-auto">
                  {t('playAgain')}
                </button>
                {gameStatus === 'won' && (
                  <button onClick={shareResults} className="btn btn-ghost text-base sm:text-lg px-5 sm:px-6 py-2.5 sm:py-3 w-full sm:w-auto">
                    <Share2Icon className="h-3.5 w-3.5" /> {t('share')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0f1c]/90 backdrop-blur-sm border-t border-white/10 px-4 py-1.5 sm:py-3 text-center text-[10px] sm:text-xs text-gray-500" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
        {t('footerNote')}
      </footer>
    </main>
  );
}
