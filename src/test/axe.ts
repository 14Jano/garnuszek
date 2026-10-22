import axe from 'axe-core';

/**
 * Runs the axe accessibility checks on the whole document and returns one line
 * per problem, so a failing test says what is wrong and where.
 *
 * Colour contrast is left out: jsdom has no layout and does not apply the style
 * sheets, so axe cannot measure it. The colours are checked on the design tokens
 * instead (`src/styles/contrast.test.ts`).
 */
export async function accessibilityProblems(): Promise<string[]> {
  // axe draws on a canvas to measure some text, which jsdom reports as "not implemented".
  HTMLCanvasElement.prototype.getContext = () => null;

  const results = await axe.run(document, {
    rules: { 'color-contrast': { enabled: false } },
  });

  return results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) => `${violation.id}: ${violation.help} (${node.target.join(' ')}) ${node.html}`,
    ),
  );
}
