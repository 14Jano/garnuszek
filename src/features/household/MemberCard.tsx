import { useState } from 'react';
import type { Member } from '../../domain/household/member';
import { dailyCalorieTarget } from '../../domain/nutrition/calorieTarget';
import { formatAge } from './format';
import { GOAL_LABELS, SEX_LABELS } from './labels';
import './MemberCard.css';

interface MemberCardProps {
  member: Member;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

export function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className="member-card">
      <h2 className="member-card__name">{member.name}</h2>
      <p className="member-card__details">
        {SEX_LABELS[member.sex]}, {formatAge(member.age)}, {member.heightCm} cm, {member.weightKg}{' '}
        kg
      </p>
      <p className="member-card__target">
        <strong>{dailyCalorieTarget(member)} kcal</strong> dziennie. Cel: {GOAL_LABELS[member.goal]}
      </p>
      {member.snackKcal > 0 && (
        <p className="member-card__details">Na przekąski: {member.snackKcal} kcal dziennie.</p>
      )}

      {confirmingDelete ? (
        <div className="member-card__actions" role="group" aria-label={`Usuwanie: ${member.name}`}>
          <span>Usunąć domownika?</span>
          <button
            type="button"
            className="btn btn--small btn--danger"
            onClick={() => onDelete(member)}
          >
            Tak, usuń
          </button>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setConfirmingDelete(false)}
          >
            Anuluj
          </button>
        </div>
      ) : (
        <div className="member-card__actions">
          <button
            type="button"
            className="btn btn--small"
            aria-label={`Edytuj: ${member.name}`}
            onClick={() => onEdit(member)}
          >
            Edytuj
          </button>
          <button
            type="button"
            className="btn btn--small"
            aria-label={`Usuń: ${member.name}`}
            onClick={() => setConfirmingDelete(true)}
          >
            Usuń
          </button>
        </div>
      )}
    </li>
  );
}
