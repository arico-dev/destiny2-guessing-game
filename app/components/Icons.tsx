import { Lightbulb, SkipForward, Warning, ShareNetwork, Star, Sun, Moon } from '@phosphor-icons/react';

// Phosphor icons standardised to a single stroke/visual family.
const SIZE = '1em';

interface IconProps {
  className?: string;
}

export function LightbulbIcon({ className }: IconProps) {
  return <Lightbulb weight="regular" className={className} size={SIZE} />;
}

export function SkipForwardIcon({ className }: IconProps) {
  return <SkipForward weight="regular" className={className} size={SIZE} />;
}

export function AlertTriangleIcon({ className }: IconProps) {
  return <Warning weight="regular" className={className} size={SIZE} />;
}

export function Share2Icon({ className }: IconProps) {
  return <ShareNetwork weight="regular" className={className} size={SIZE} />;
}

export function StarIcon({ className }: IconProps) {
  return <Star weight="fill" className={className} size={SIZE} />;
}

export function SunIcon({ className }: IconProps) {
  return <Sun weight="regular" className={className} size={SIZE} />;
}

export function MoonIcon({ className }: IconProps) {
  return <Moon weight="regular" className={className} size={SIZE} />;
}
