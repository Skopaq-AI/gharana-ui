/**
 * Light / Auto / Dark, as three segments rather than a two-state switch.
 *
 * A single toggle can only express two of the three states, so apps that use
 * one either drop "follow my system" or hide it in a settings page nobody
 * opens. Showing all three costs about forty pixels and removes the question
 * "is this following my system or did I set it once in 2024".
 *
 * The current choice is marked with aria-checked on a radiogroup, not by colour
 * alone — colour is the one channel guaranteed to be unavailable to some
 * readers of a theme control.
 */
import React, { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

import { applyTheme, storedTheme, type Theme } from '../lib/theme';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'auto', label: 'Match system', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [theme, setTheme] = useState<Theme>('auto');

  // Read on mount, not during render: localStorage is unavailable during SSR
  // and throws outright in some embedded webviews.
  useEffect(() => setTheme(storedTheme()), []);

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-full border border-line bg-panel p-0.5 ${className ?? ''}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              active
                ? 'bg-accent text-accent-on'
                : 'text-dim hover:text-ink focus-visible:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
};
