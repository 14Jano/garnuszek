import { useState } from 'react';
import './ShareActions.css';

interface ShareActionsProps {
  title: string;
  text: string;
}

/**
 * Ways to pass the list on: the phone's share sheet where there is one, copying
 * to the clipboard, and a WhatsApp link. Nothing leaves the device until the
 * user picks one of them.
 */
export function ShareActions({ title, text }: ShareActionsProps) {
  const [notice, setNotice] = useState('');
  const canShare = typeof navigator.share === 'function';

  async function share() {
    try {
      await navigator.share({ title, text });
    } catch (error) {
      // Closing the share sheet without choosing anything is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Could not share the list', error);
      setNotice('Nie udało się udostępnić listy.');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Skopiowano listę do schowka.');
    } catch (error) {
      console.error('Could not copy the list', error);
      setNotice('Nie udało się skopiować listy.');
    }
  }

  return (
    <div className="share-actions">
      <div className="share-actions__buttons">
        {canShare && (
          <button type="button" className="btn btn--small" onClick={() => void share()}>
            Udostępnij listę
          </button>
        )}
        <button type="button" className="btn btn--small" onClick={() => void copy()}>
          Kopiuj listę
        </button>
        <a
          className="btn btn--small"
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Wyślij przez WhatsApp
        </a>
      </div>
      <p className="share-actions__notice" role="status">
        {notice}
      </p>
    </div>
  );
}
