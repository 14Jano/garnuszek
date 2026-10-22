import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface ConfirmFocus {
  /** The button that asks to do the risky thing. */
  trigger: RefObject<HTMLButtonElement | null>;
  /** The button that backs out of the confirmation. */
  cancel: RefObject<HTMLButtonElement | null>;
}

/**
 * Looks after keyboard focus in a two-step action ("Delete" then "Yes, delete").
 * The buttons are swapped for the confirmation, so without this focus falls back
 * to the top of the page and a keyboard or screen reader user loses their place.
 *
 * When the confirmation opens, focus goes to its "cancel" button, the safe
 * choice, so pressing Enter by reflex does not delete anything. When the user
 * cancels, focus goes back to the button they started from.
 */
export function useConfirmFocus(confirming: boolean): ConfirmFocus {
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(confirming);

  useEffect(() => {
    if (wasConfirming.current === confirming) return;
    wasConfirming.current = confirming;
    (confirming ? cancel : trigger).current?.focus();
  }, [confirming]);

  return { trigger, cancel };
}
