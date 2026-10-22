import { describe, expect, it } from 'vitest';
import { explainError } from './explainError';

function named(name: string, inner?: unknown): Error {
  return Object.assign(new Error(name), { name, inner });
}

describe('explainError', () => {
  it.each(['OpenFailedError', 'SecurityError', 'InvalidStateError'])(
    'says the browser refuses to store data for %s',
    (name) => {
      expect(explainError(named(name))).toMatch(/nie pozwala Garnuszkowi zapisywać danych/);
    },
  );

  it('looks inside the error that the database library wraps', () => {
    const error = named('OpenFailedError', named('QuotaExceededError'));

    expect(explainError(error)).toMatch(/zabrakło miejsca/);
  });

  it('knows a database written by a newer version of the app', () => {
    expect(explainError(named('VersionError'))).toMatch(/nowsza wersja Garnuszka/);
  });

  it('knows a database closed by an update in another tab', () => {
    expect(explainError(named('DatabaseClosedError'))).toMatch(/innej karcie/);
  });

  it.each([new Error('boom'), 'boom', null, undefined, 42])(
    'gives a general message for %s',
    (error) => {
      expect(explainError(error)).toBe('Garnuszek natrafił na nieoczekiwany błąd.');
    },
  );
});
