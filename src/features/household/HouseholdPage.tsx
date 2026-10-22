import { useState } from 'react';
import { HealthDisclaimer } from '../../components/HealthDisclaimer';
import { requestPersistentStorage } from '../../data/persistence';
import { addMember, removeMember, updateMember } from '../../data/memberRepository';
import type { Member, NewMember } from '../../domain/household/member';
import { MemberCard } from './MemberCard';
import { MemberForm } from './MemberForm';
import { useFocusWhenChanged } from '../../hooks/useFocusWhenChanged';
import { useMembers } from '../../hooks/useMembers';
import './HouseholdPage.css';

type View = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; member: Member };

const LIST_VIEW: View = { kind: 'list' };

export function HouseholdPage() {
  const members = useMembers();
  const [view, setView] = useState<View>(LIST_VIEW);
  const [saveFailed, setSaveFailed] = useState(false);
  // The list and the form replace each other, so focus follows to the new heading.
  const heading = useFocusWhenChanged<HTMLHeadingElement>(view.kind);

  /** Runs a storage write and reports whether it worked. */
  async function attempt(write: () => Promise<unknown>): Promise<boolean> {
    setSaveFailed(false);
    try {
      await write();
      return true;
    } catch (error) {
      console.error('Could not save household data', error);
      setSaveFailed(true);
      return false;
    }
  }

  async function handleAdd(input: NewMember) {
    if (await attempt(() => addMember(input))) {
      setView(LIST_VIEW);
      // Ask only once the user has something worth keeping.
      void requestPersistentStorage();
    }
  }

  async function handleUpdate(id: string, input: NewMember) {
    if (await attempt(() => updateMember({ ...input, id }))) {
      setView(LIST_VIEW);
    }
  }

  async function handleDelete(member: Member) {
    // The card that had focus is going away.
    if (await attempt(() => removeMember(member.id))) heading.current?.focus();
  }

  function showList() {
    setSaveFailed(false);
    setView(LIST_VIEW);
  }

  if (view.kind !== 'list') {
    const editing = view.kind === 'edit' ? view.member : undefined;

    return (
      <section>
        <h1 ref={heading} tabIndex={-1}>
          {editing ? 'Edycja domownika' : 'Nowy domownik'}
        </h1>
        {saveFailed && <SaveError />}
        <MemberForm
          key={editing?.id ?? 'new'}
          initialValues={editing}
          submitLabel={editing ? 'Zapisz zmiany' : 'Dodaj domownika'}
          onSubmit={(input) => (editing ? handleUpdate(editing.id, input) : handleAdd(input))}
          onCancel={showList}
        />
      </section>
    );
  }

  return (
    <section>
      <h1 ref={heading} tabIndex={-1}>
        Domownicy
      </h1>
      <p className="lead">Wpisujesz domowników raz, a Garnuszek liczy, ile kto powinien zjeść.</p>

      {saveFailed && <SaveError />}

      {members === undefined ? (
        <p>Wczytywanie…</p>
      ) : members.length === 0 ? (
        <p className="household-empty">
          Nie ma tu jeszcze nikogo. Dodaj pierwszego domownika, żeby poznać jego dzienne
          zapotrzebowanie.
        </p>
      ) : (
        <ul className="household-list">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onEdit={(selected) => setView({ kind: 'edit', member: selected })}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      <button type="button" className="btn btn--primary" onClick={() => setView({ kind: 'add' })}>
        Dodaj domownika
      </button>

      <HealthDisclaimer />
    </section>
  );
}

function SaveError() {
  return (
    <p className="form-error" role="alert">
      Nie udało się zapisać zmian. Spróbuj ponownie.
    </p>
  );
}
