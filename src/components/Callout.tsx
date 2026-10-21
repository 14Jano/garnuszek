import type { ReactNode } from 'react';
import './Callout.css';

/** A highlighted side note, e.g. a disclaimer. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="callout" role="note">
      {children}
    </div>
  );
}
