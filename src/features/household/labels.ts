import type { ActivityLevel, Goal, Sex } from '../../domain/nutrition/calorieTarget';

export const SEX_LABELS: Record<Sex, string> = {
  female: 'Kobieta',
  male: 'Mężczyzna',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Siedzący tryb życia (mało ruchu)',
  light: 'Lekka aktywność (1–3 treningi w tygodniu)',
  moderate: 'Umiarkowana aktywność (3–5 treningów w tygodniu)',
  active: 'Duża aktywność (6–7 treningów lub praca fizyczna)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Schudnąć',
  maintain: 'Utrzymać wagę',
  gain: 'Przytyć',
};
