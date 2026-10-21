/**
 * Daily calorie estimates for a household member.
 *
 * The formulas and their limits are described in docs/NUTRITION.md. In short:
 * Mifflin-St Jeor for resting energy, an activity multiplier on top, then a
 * percentage adjustment for the goal. The result is an orientation for healthy
 * people, not medical advice.
 */

export type Sex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Goal = 'lose' | 'maintain' | 'gain';

export const SEXES: readonly Sex[] = ['female', 'male'];
export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
];
export const GOALS: readonly Goal[] = ['lose', 'maintain', 'gain'];

export interface BodyProfile {
  sex: Sex;
  /** Age in full years. */
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -0.15,
  maintain: 0,
  gain: 0.1,
};

/**
 * Lower bound for a weight-loss target, so a small person never gets an
 * unreasonably aggressive deficit. It is not applied to "maintain": children
 * legitimately need fewer calories than an adult's minimum.
 */
const MIN_WEIGHT_LOSS_KCAL: Record<Sex, number> = {
  female: 1200,
  male: 1500,
};

/** Resting energy expenditure in kcal/day (Mifflin-St Jeor equation). */
export function basalMetabolicRate({ sex, age, heightCm, weightKg }: BodyProfile): number {
  assertPositive('age', age);
  assertPositive('heightCm', heightCm);
  assertPositive('weightKg', weightKg);

  const sexConstant = sex === 'male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
}

/** Total daily energy expenditure in kcal/day: resting energy times activity. */
export function dailyEnergyExpenditure(profile: BodyProfile): number {
  return basalMetabolicRate(profile) * ACTIVITY_FACTOR[profile.activity];
}

/** Suggested daily intake in whole kcal for the person's goal. */
export function dailyCalorieTarget(profile: BodyProfile): number {
  const adjusted = dailyEnergyExpenditure(profile) * (1 + GOAL_ADJUSTMENT[profile.goal]);
  const target = Math.round(adjusted);

  if (profile.goal === 'lose') {
    return Math.max(target, MIN_WEIGHT_LOSS_KCAL[profile.sex]);
  }
  return target;
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
}
