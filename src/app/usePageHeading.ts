import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export const APP_NAME = 'Garnuszek';
export const DEFAULT_TITLE = 'Garnuszek – planer posiłków dla rodziny';

/**
 * The screen a path belongs to. Days in the path are left out, so moving to
 * another day of the calendar or another week of the shopping list is still the
 * same screen.
 */
export function viewOf(pathname: string): string {
  return pathname.replace(/\/\d{4}-\d{2}-\d{2}(?=\/|$)/g, '');
}

/**
 * Keeps the tab title and the keyboard focus in step with the screen shown in
 * `container`, which a single-page app does not do by itself.
 *
 * - The title is the text of the screen's `<h1>`, so every screen has its own
 *   title in the tab, in the history and for a screen reader. It follows the
 *   heading when it changes, e.g. once a recipe has loaded.
 * - When the user moves to another screen, focus goes to its `<h1>`. A screen
 *   reader then says where they are, and a keyboard user continues from the top
 *   of the new screen instead of from a link that is no longer there. Focus is
 *   left alone on the first screen and when only the day or week changes.
 *
 * The heading may appear a moment after the screen changes (the screen waits
 * for its data), so the container is watched rather than read once.
 */
export function usePageHeading(container: RefObject<HTMLElement | null>, view: string): void {
  const currentView = useRef(view);
  const settledView = useRef(view);

  // Set while the DOM is committed, before the observer below runs on that change.
  useLayoutEffect(() => {
    currentView.current = view;
  }, [view]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    function sync() {
      const heading = element?.querySelector('h1');
      const text = heading?.textContent?.trim();
      document.title = text ? `${text} – ${APP_NAME}` : DEFAULT_TITLE;

      if (heading && settledView.current !== currentView.current) {
        settledView.current = currentView.current;
        heading.tabIndex = -1;
        heading.focus();
      }
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [container]);
}
