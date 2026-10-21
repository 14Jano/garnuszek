import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { BUILTIN_RECIPES } from '../../content/recipes';
import { exportBackup, importBackup } from '../../data/backupRepository';
import { requestPersistentStorage } from '../../data/persistence';
import { parseBackup } from '../../domain/backup/backup';
import type { Backup, BackupProblem, DroppedItems } from '../../domain/backup/backup';
import { toDateKey } from '../../domain/plan/dates';
import { downloadTextFile } from './download';
import './BackupSection.css';

/** A real backup is a few kilobytes. Anything this big is certainly another file. */
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

const BUILT_IN_RECIPE_IDS: ReadonlySet<string> = new Set(
  BUILTIN_RECIPES.map((recipe) => recipe.id),
);

type ImportState =
  | { kind: 'idle' }
  | { kind: 'review'; backup: Backup; dropped: DroppedItems }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

const PROBLEM_MESSAGES: Record<Exclude<BackupProblem, 'invalid-data'>, string> = {
  'not-json': 'Tego pliku nie da się odczytać. Wybierz plik kopii zapasowej pobrany z Garnuszka.',
  'not-a-backup': 'To nie jest kopia zapasowa Garnuszka.',
  'newer-version':
    'Ta kopia powstała w nowszej wersji Garnuszka. Zaktualizuj aplikację i spróbuj ponownie.',
};

export function BackupSection() {
  const fileInputId = useId();
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' });
  const [exportFailed, setExportFailed] = useState(false);

  async function handleExport() {
    setExportFailed(false);
    try {
      const backup = await exportBackup();
      downloadTextFile(
        `garnuszek-kopia-${toDateKey(new Date())}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      );
    } catch (error) {
      console.error('Could not create the backup', error);
      setExportFailed(true);
    }
  }

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    // Forget the choice, so picking the same file again works.
    input.value = '';
    if (!file) return;

    if (file.size > MAX_BACKUP_BYTES) {
      setImportState({ kind: 'error', message: 'Ten plik jest za duży, żeby był kopią zapasową.' });
      return;
    }

    const result = parseBackup(await file.text(), {
      catalog: INGREDIENT_CATALOG,
      builtInRecipeIds: BUILT_IN_RECIPE_IDS,
    });

    if (result.ok) {
      setImportState({ kind: 'review', backup: result.backup, dropped: result.dropped });
    } else {
      setImportState({
        kind: 'error',
        message:
          result.problem === 'invalid-data'
            ? `Plik kopii jest uszkodzony (problem w: ${result.detail ?? 'nieznane miejsce'}). Nic nie zostało zmienione.`
            : PROBLEM_MESSAGES[result.problem],
      });
    }
  }

  async function handleRestore(backup: Backup) {
    try {
      await importBackup(backup);
      void requestPersistentStorage();
      setImportState({ kind: 'done' });
    } catch (error) {
      console.error('Could not restore the backup', error);
      setImportState({
        kind: 'error',
        message: 'Nie udało się wczytać kopii. Dane na tym urządzeniu nie zostały zmienione.',
      });
    }
  }

  return (
    <section className="backup" aria-labelledby="backup-title">
      <h2 id="backup-title">Kopia zapasowa</h2>
      <p>
        Wszystko, co wpiszesz, zostaje tylko na tym urządzeniu. Kopia zapasowa to plik z Twoimi
        domownikami, własnymi przepisami, planem i ulubionymi. Dzięki niemu przeniesiesz dane na
        nowy telefon albo odzyskasz je po wyczyszczeniu przeglądarki.
      </p>

      <div className="backup__action">
        <button type="button" className="btn btn--primary" onClick={() => void handleExport()}>
          Pobierz kopię zapasową
        </button>
        {exportFailed && (
          <p className="form-error" role="alert">
            Nie udało się przygotować kopii. Spróbuj ponownie.
          </p>
        )}
      </div>

      <div className="field backup__action">
        <label className="field__label" htmlFor={fileInputId}>
          Wczytaj kopię zapasową
        </label>
        <input
          id={fileInputId}
          className="input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleFileChosen(event)}
        />
      </div>

      {importState.kind === 'review' && (
        <div className="backup__review" role="group" aria-label="Wczytywanie kopii zapasowej">
          <p>
            Kopia z {formatDate(importState.backup.exportedAt)}. Domownicy:{' '}
            {importState.backup.members.length}, własne przepisy:{' '}
            {importState.backup.customRecipes.length}, zaplanowane posiłki:{' '}
            {importState.backup.planEntries.length}.
          </p>
          {describeDropped(importState.dropped) && (
            <p className="backup__dropped">{describeDropped(importState.dropped)}</p>
          )}
          <p>
            <strong>
              Wczytanie zastąpi wszystkie dane na tym urządzeniu. Tego nie można cofnąć.
            </strong>{' '}
            Jeśli masz tu coś ważnego, najpierw pobierz kopię zapasową.
          </p>
          <div className="backup__buttons">
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => void handleRestore(importState.backup)}
            >
              Zastąp dane na tym urządzeniu
            </button>
            <button type="button" className="btn" onClick={() => setImportState({ kind: 'idle' })}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {importState.kind === 'done' && (
        <p className="backup__done" role="status">
          Wczytano kopię zapasową.
        </p>
      )}

      {importState.kind === 'error' && (
        <p className="form-error" role="alert">
          {importState.message}
        </p>
      )}
    </section>
  );
}

function formatDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' }).format(new Date(isoTimestamp));
}

/** Tells what was left out because the app no longer has it, or nothing if all was kept. */
function describeDropped(dropped: DroppedItems): string {
  const parts = [
    dropped.planEntries > 0 && `zaplanowane posiłki: ${dropped.planEntries}`,
    dropped.favorites > 0 && `ulubione: ${dropped.favorites}`,
    dropped.shoppingChecks > 0 && `odhaczone zakupy: ${dropped.shoppingChecks}`,
    dropped.snackOverrides > 0 && `przekąski na pojedyncze dni: ${dropped.snackOverrides}`,
  ].filter(Boolean);

  return parts.length === 0
    ? ''
    : `Pominiemy to, czego ta wersja aplikacji już nie zna (${parts.join(', ')}).`;
}
