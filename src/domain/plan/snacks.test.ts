import { describe, expect, it } from 'vitest';
import type { Member } from '../household/member';
import { USUAL_SNACKS, effectiveSnackKcal, mealBudgetKcal, snackAllowance } from './snacks';

const anna: Member = {
  id: 'anna',
  name: 'Anna',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'light',
  goal: 'maintain',
  snackKcal: 200,
};

const bartek: Member = { ...anna, id: 'bartek', name: 'Bartek', snackKcal: 0 };

describe('USUAL_SNACKS', () => {
  it('uses the amount from the profile on every day', () => {
    expect(USUAL_SNACKS('2026-10-21', anna)).toBe(200);
    expect(USUAL_SNACKS('2026-10-22', bartek)).toBe(0);
  });
});

describe('snackAllowance', () => {
  const allowance = snackAllowance([
    { date: '2026-10-21', memberId: 'anna', kcal: 450 },
    { date: '2026-10-22', memberId: 'bartek', kcal: 0 },
  ]);

  it('uses the usual amount unless the day has its own', () => {
    expect(allowance('2026-10-20', anna)).toBe(200);
    expect(allowance('2026-10-21', anna)).toBe(450);
  });

  it('applies a day amount only to the person it was set for', () => {
    expect(allowance('2026-10-21', bartek)).toBe(0);
  });

  it('lets a day amount of zero replace a usual amount', () => {
    expect(allowance('2026-10-22', { ...bartek, snackKcal: 300 })).toBe(0);
  });
});

describe('effectiveSnackKcal and mealBudgetKcal', () => {
  it('sets the snack amount aside from the daily target', () => {
    expect(effectiveSnackKcal(2000, 300)).toBe(300);
    expect(mealBudgetKcal(2000, 300)).toBe(1700);
  });

  it('leaves the whole day for meals when there are no snacks', () => {
    expect(mealBudgetKcal(2000, 0)).toBe(2000);
  });

  it('never takes more than half of the day for snacks', () => {
    expect(effectiveSnackKcal(1800, 1000)).toBe(900);
    expect(mealBudgetKcal(1800, 1000)).toBe(900);
  });

  it('ignores a negative amount', () => {
    expect(mealBudgetKcal(2000, -100)).toBe(2000);
  });
});
