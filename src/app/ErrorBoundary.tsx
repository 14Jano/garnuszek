import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ISSUES_URL } from '../content/project';
import { explainError } from './explainError';
import { ROUTES } from './navigation';

interface ErrorBoundaryProps {
  /** When this changes after an error, the screen is tried again. */
  resetKey: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: unknown;
  failed: boolean;
}

/**
 * Catches errors thrown while a screen is shown, including a refusal of the
 * browser's storage, which the live queries rethrow. Without it the whole
 * screen would go blank. The rest of the app stays usable, so the person can
 * move to another screen, and the data is untouched.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, failed: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('A screen failed to show', error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null, failed: false });
    }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <section>
        <h1>Coś poszło nie tak</h1>
        <p role="alert">{explainError(this.state.error)}</p>
        <p>
          Twoje dane zostały na tym urządzeniu. Jeśli błąd wraca, pobierz kopię zapasową w{' '}
          <Link to={ROUTES.settings}>Ustawieniach</Link> i{' '}
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
            zgłoś problem na GitHubie
          </a>
          .
        </p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Odśwież stronę
        </button>
      </section>
    );
  }
}
