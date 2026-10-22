/** What went wrong, in words for the person using the app. */
const BY_NAME: Record<string, string> = {
  QuotaExceededError:
    'Na tym urządzeniu zabrakło miejsca na dane. Zwolnij trochę miejsca i spróbuj ponownie.',
  VersionError:
    'Dane na tym urządzeniu zapisała nowsza wersja Garnuszka. Odśwież stronę, żeby pobrać najnowszą wersję aplikacji.',
  DatabaseClosedError:
    'Baza danych została zamknięta, bo Garnuszek jest właśnie aktualizowany w innej karcie. Odśwież stronę.',
};

const STORAGE_NOT_ALLOWED =
  'Przeglądarka nie pozwala Garnuszkowi zapisywać danych na tym urządzeniu. Częstą przyczyną jest tryb prywatny albo zablokowane dane witryn. Otwórz Garnuszka w zwykłej karcie.';

/** Errors that mean the browser refuses to open or use its storage. */
const STORAGE_REFUSED = new Set(['OpenFailedError', 'SecurityError', 'InvalidStateError']);

const UNKNOWN = 'Garnuszek natrafił na nieoczekiwany błąd.';

/**
 * Explains an error that stopped a screen from showing. The most common causes
 * are about the browser's storage, so those get their own wording; anything else
 * gets a general message, because a technical one would not help.
 */
export function explainError(error: unknown): string {
  for (const name of errorNames(error)) {
    const message = BY_NAME[name];
    if (message) return message;
  }
  if (errorNames(error).some((name) => STORAGE_REFUSED.has(name))) return STORAGE_NOT_ALLOWED;
  return UNKNOWN;
}

/** The name of the error and of the one inside it: Dexie wraps what the browser threw. */
function errorNames(error: unknown): string[] {
  const names: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === 'object' && current !== null; depth += 1) {
    const { name, inner } = current as { name?: unknown; inner?: unknown };
    if (typeof name === 'string') names.push(name);
    current = inner;
  }
  return names;
}
