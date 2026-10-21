import { describe, expect, it } from 'vitest';
import {
  basalMetabolicRate,
  dailyCalorieTarget,
  dailyEnergyExpenditure,
  type BodyProfile,
} from './calorieTarget';

const adultMan: BodyProfile = {
  sex: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'sedentary',
  goal: 'maintain',
};

const adultWoman: BodyProfile = {
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'sedentary',
  goal: 'maintain',
};

describe('basalMetabolicRate', () => {
  it('uses the Mifflin-St Jeor equation for men', () => {
    // 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    expect(basalMetabolicRate(adultMan)).toBe(1780);
  });

  it('uses the Mifflin-St Jeor equation for women', () => {
    // 10 * 60 + 6.25 * 165 - 5 * 30 - 161
    expect(basalMetabolicRate(adultWoman)).toBeCloseTo(1320.25, 2);
  });

  it.each([
    ['age', { age: 0 }],
    ['heightCm', { heightCm: -1 }],
    ['weightKg', { weightKg: Number.NaN }],
    ['weightKg', { weightKg: Number.POSITIVE_INFINITY }],
  ])('rejects an invalid %s', (_field, override) => {
    expect(() => basalMetabolicRate({ ...adultMan, ...override })).toThrow(RangeError);
  });
});

describe('dailyEnergyExpenditure', () => {
  it('scales resting energy by the activity level', () => {
    expect(dailyEnergyExpenditure({ ...adultMan, activity: 'sedentary' })).toBeCloseTo(2136, 5);
    expect(dailyEnergyExpenditure({ ...adultMan, activity: 'moderate' })).toBeCloseTo(2759, 5);
  });
});

describe('dailyCalorieTarget', () => {
  it('matches expenditure when the goal is to maintain weight', () => {
    expect(dailyCalorieTarget(adultMan)).toBe(2136);
  });

  it('removes 15% to lose weight', () => {
    // 1320.25 * 1.2 * 0.85 = 1346.655
    expect(dailyCalorieTarget({ ...adultWoman, goal: 'lose' })).toBe(1347);
  });

  it('adds 10% to gain weight', () => {
    // 2136 * 1.1 = 2349.6
    expect(dailyCalorieTarget({ ...adultMan, goal: 'gain' })).toBe(2350);
  });

  it('never goes below the weight-loss floor for women', () => {
    const smallWoman: BodyProfile = {
      sex: 'female',
      age: 25,
      heightCm: 150,
      weightKg: 45,
      activity: 'sedentary',
      goal: 'lose',
    };
    // Unclamped this would be about 1124 kcal.
    expect(dailyCalorieTarget(smallWoman)).toBe(1200);
  });

  it('never goes below the weight-loss floor for men', () => {
    const smallMan: BodyProfile = {
      sex: 'male',
      age: 60,
      heightCm: 160,
      weightKg: 50,
      activity: 'sedentary',
      goal: 'lose',
    };
    // Unclamped this would be about 1229 kcal.
    expect(dailyCalorieTarget(smallMan)).toBe(1500);
  });

  it('does not apply the floor when maintaining, e.g. for a child', () => {
    const child: BodyProfile = {
      sex: 'male',
      age: 7,
      heightCm: 120,
      weightKg: 24,
      activity: 'sedentary',
      goal: 'maintain',
    };
    // 10 * 24 + 6.25 * 120 - 5 * 7 + 5 = 960, times 1.2
    expect(dailyCalorieTarget(child)).toBe(1152);
  });
});
