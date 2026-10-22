import { useState } from 'react';
import { deleteAllData } from '../../data/backupRepository';
import { useConfirmFocus } from '../../hooks/useConfirmFocus';

/** Wipes everything the user entered from this device, after a confirmation. */
export function DeleteDataSection() {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<'none' | 'deleted' | 'failed'>('none');
  const { trigger, cancel } = useConfirmFocus(confirming);

  async function handleDelete() {
    try {
      await deleteAllData();
      setResult('deleted');
    } catch (error) {
      console.error('Could not delete the data', error);
      setResult('failed');
    }
    setConfirming(false);
  }

  return (
    <section aria-labelledby="delete-title">
      <h2 id="delete-title">Usuwanie danych</h2>
      <p>
        Usuwa z tego urządzenia domowników, własne przepisy, plan, ulubione i odhaczone zakupy.
        Wbudowane przepisy zostają. Tego nie można cofnąć, więc najpierw pobierz kopię zapasową.
      </p>

      {confirming ? (
        <div role="group" aria-label="Usuwanie wszystkich danych" className="backup__buttons">
          <span>Na pewno usunąć wszystkie dane?</span>
          <button type="button" className="btn btn--danger" onClick={() => void handleDelete()}>
            Tak, usuń wszystko
          </button>
          <button type="button" className="btn" ref={cancel} onClick={() => setConfirming(false)}>
            Anuluj
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--danger"
          ref={trigger}
          onClick={() => setConfirming(true)}
        >
          Usuń wszystkie dane
        </button>
      )}

      {result === 'deleted' && <p role="status">Usunięto wszystkie dane z tego urządzenia.</p>}
      {result === 'failed' && (
        <p className="form-error" role="alert">
          Nie udało się usunąć danych. Spróbuj ponownie.
        </p>
      )}
    </section>
  );
}
