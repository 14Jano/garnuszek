/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Vitest does not load style sheets, so the file is read from disk. Tests run from the
// root of the project.
const TOKENS_CSS = readFileSync('src/styles/index.css', 'utf8');

/**
 * Checks the colours of the design tokens against WCAG 2.2 level AA. jsdom has
 * no layout, so contrast cannot be measured on the rendered screens; instead the
 * pairs of tokens that the components put on top of each other are checked here,
 * in the light and in the dark theme.
 */

type Palette = Record<string, string>;

function readPalette(block: string): Palette {
  const palette: Palette = {};
  for (const [, name, value] of block.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (name && value) palette[name] = value;
  }
  return palette;
}

const darkBlock = /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(
  TOKENS_CSS,
)?.[1];
const lightBlock = /^:root\s*\{([^}]*)\}/m.exec(TOKENS_CSS)?.[1];

const light = readPalette(lightBlock ?? '');
const dark = { ...light, ...readPalette(darkBlock ?? '') };

function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [lighter = 0, darker = 0] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Text needs 4.5:1. Lines, borders and icons that carry meaning need 3:1. */
const TEXT = 4.5;
const GRAPHICS = 3;

const PAIRS: [foreground: string, background: string, minimum: number, use: string][] = [
  ['color-text', 'color-bg', TEXT, 'body text'],
  ['color-text', 'color-surface', TEXT, 'text on cards'],
  ['color-text-muted', 'color-bg', TEXT, 'secondary text'],
  ['color-text-muted', 'color-surface', TEXT, 'secondary text on cards and chart labels'],
  ['color-primary', 'color-bg', TEXT, 'links and the name of the app'],
  ['color-primary', 'color-surface', TEXT, 'links on cards, the active tab'],
  ['color-on-primary', 'color-primary', TEXT, 'text on primary buttons'],
  ['color-danger', 'color-bg', TEXT, 'error messages'],
  ['color-danger', 'color-surface', TEXT, 'error messages and delete buttons on cards'],
  ['color-accent-strong', 'color-accent-soft', TEXT, 'text in notices'],
  ['color-accent-strong', 'color-surface', TEXT, 'the target on the chart'],
  ['color-border-strong', 'color-bg', GRAPHICS, 'the edge of buttons and fields'],
  ['color-border-strong', 'color-surface', GRAPHICS, 'the edge of buttons and fields on cards'],
  ['color-primary', 'color-surface', GRAPHICS, 'the line of the chart and the focus ring'],
  ['color-primary', 'color-bg', GRAPHICS, 'the focus ring'],
];

describe('design tokens', () => {
  it('are read from the style sheet', () => {
    expect(Object.keys(light)).toContain('color-text');
    expect(dark['color-text']).not.toBe(light['color-text']);
  });

  describe.each([
    ['light theme', light],
    ['dark theme', dark],
  ])('in the %s', (_theme, palette) => {
    it.each(PAIRS)('%s on %s reaches %s:1 (%s)', (foreground, background, minimum) => {
      const ratio = contrast(palette[foreground] ?? '', palette[background] ?? '');

      expect(ratio).toBeGreaterThanOrEqual(minimum);
    });
  });
});
