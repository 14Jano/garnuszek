import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Moves keyboard focus to the element the returned ref is attached to whenever
 * `value` changes, but not when the component first appears. For a part of a
 * screen that is swapped in place (a form replacing a list), where the element
 * that had focus disappears and a keyboard or screen reader user would otherwise
 * be sent back to the top of the page. The element needs `tabIndex={-1}` unless
 * it is focusable already.
 */
export function useFocusWhenChanged<T extends HTMLElement>(value: unknown): RefObject<T | null> {
  const element = useRef<T>(null);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    element.current?.focus();
  }, [value]);

  return element;
}
