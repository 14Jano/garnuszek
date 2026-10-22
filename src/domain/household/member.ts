import type { BodyProfile, Goal } from '../nutrition/calorieTarget';
import { checkNumber } from '../validation';
import type { FieldProblem } from '../validation';
import type { Restrictions } from './restrictions';

/** A person who eats from the shared meal plan. */
export interface Member extends BodyProfile {
  id: string;
  name: string;
  /** Calories per day the person keeps for snacks, so meals are sized for the rest. */
  snackKcal: number;
  /** The weight the person wants to reach. Only meaningful when losing or gaining weight. */
  targetWeightKg?: number;
  /** What the person does not eat. Left out when there is nothing. */
  restrictions?: Restrictions;
}

/** What the user fills in; the id is assigned when the member is stored. */
export type NewMember = Omit<Member, 'id'>;

export const ADULT_AGE = 18;

export const MEMBER_LIMITS = {
  nameMaxLength: 40,
  age: { min: 1, max: 120 },
  heightCm: { min: 50, max: 250 },
  weightKg: { min: 10, max: 300 },
  snackKcal: { min: 0, max: 1000 },
} as const;

/**
 * Goals a person may choose. Children and teenagers are still growing, so for
 * them the only supported goal is keeping their current weight (see
 * docs/NUTRITION.md). An unknown age (NaN) is treated like an adult so the
 * form does not lock up while the user is typing.
 */
export function allowedGoals(age: number): readonly Goal[] {
  return age < ADULT_AGE ? ['maintain'] : ['lose', 'maintain', 'gain'];
}

export type MemberField = 'name' | 'age' | 'heightCm' | 'weightKg' | 'targetWeightKg' | 'snackKcal';

export type MemberErrors = Partial<Record<MemberField, FieldProblem>>;

export interface MemberDraft {
  name: string;
  /** NaN stands for an empty or unreadable input. */
  age: number;
  heightCm: number;
  weightKg: number;
  snackKcal: number;
  /** The goal decides whether a target weight is checked: it only matters when losing or gaining. */
  goal?: Goal;
  /** Left out when the person has no target. NaN stands for an unreadable input. */
  targetWeightKg?: number;
}

export function validateMember(draft: MemberDraft): MemberErrors {
  const errors: MemberErrors = {};

  const name = draft.name.trim();
  if (name === '') {
    errors.name = 'required';
  } else if (name.length > MEMBER_LIMITS.nameMaxLength) {
    errors.name = 'invalid';
  }

  const age = checkNumber(draft.age, MEMBER_LIMITS.age, { integer: true });
  if (age) errors.age = age;

  const heightCm = checkNumber(draft.heightCm, MEMBER_LIMITS.heightCm);
  if (heightCm) errors.heightCm = heightCm;

  const weightKg = checkNumber(draft.weightKg, MEMBER_LIMITS.weightKg);
  if (weightKg) errors.weightKg = weightKg;

  const snackKcal = checkNumber(draft.snackKcal, MEMBER_LIMITS.snackKcal, { integer: true });
  if (snackKcal) errors.snackKcal = snackKcal;

  if (isTargetWeightWrong(draft)) errors.targetWeightKg = 'invalid';

  return errors;
}

/**
 * A target weight is optional. When there is one it must be a possible weight
 * on the right side of the current one: below it to lose weight, above it to
 * gain. For keeping weight a target means nothing and is ignored.
 */
function isTargetWeightWrong({ goal, targetWeightKg, weightKg }: MemberDraft): boolean {
  if (targetWeightKg === undefined || goal === undefined || goal === 'maintain') return false;
  if (checkNumber(targetWeightKg, MEMBER_LIMITS.weightKg)) return true;

  // Without a readable current weight there is nothing to compare with yet.
  if (Number.isNaN(weightKg)) return false;
  return goal === 'lose' ? targetWeightKg >= weightKg : targetWeightKg <= weightKg;
}
