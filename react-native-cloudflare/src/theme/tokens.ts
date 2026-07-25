/**
 * Design tokens — the React Native side of what `app.zon` declares for the
 * Zero Native build: the Geist pack with the design's Pulse orange-red
 * (`theme_accent = "#ff5a2b"`) as the single brand override, resolved
 * light/dark from the OS appearance.
 *
 * The names are the semantic ones the Zero Native markup binds
 * (`background`, `surface`, `surface_subtle`, `text_muted`, `accent`,
 * `accent_text`), so the two implementations style through the same
 * vocabulary.
 */

export const ACCENT = '#ff5a2b';

export type Palette = {
  background: string;
  surface: string;
  surface_subtle: string;
  text: string;
  text_muted: string;
  border: string;
  accent: string;
  accent_text: string;
  /** Fill behind the accent-tinted squares on the detail screen. */
  accent_subtle: string;
};

/** Geist gray ramp, light appearance. */
export const light: Palette = {
  background: '#ffffff',
  surface: '#f2f2f2',
  surface_subtle: '#ebebeb',
  text: '#171717',
  text_muted: '#666666',
  border: '#e5e5e5',
  accent: ACCENT,
  accent_text: '#ffffff',
  accent_subtle: '#ffece5',
};

/** Geist gray ramp, dark appearance. */
export const dark: Palette = {
  background: '#0a0a0a',
  surface: '#171717',
  surface_subtle: '#262626',
  text: '#ededed',
  text_muted: '#a1a1a1',
  border: '#2e2e2e',
  accent: ACCENT,
  accent_text: '#ffffff',
  accent_subtle: '#3d1a10',
};

/** `radius="md" | "lg" | "xl"` in the markup. */
export const radius = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * `size="sm" | "heading"` in the markup; unmarked text is `base`. `scale`
 * attributes multiply the base size (`scale="1.35"` -> 20.25pt).
 */
export const fontSize = {
  sm: 13,
  base: 15,
  heading: 26,
} as const;

export type FontSizeToken = keyof typeof fontSize;

export const fontWeight = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

export type FontWeightToken = keyof typeof fontWeight;
