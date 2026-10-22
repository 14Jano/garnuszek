import { describe, expect, it } from 'vitest';
import { allowedGoals, validateMember, type MemberDraft } from './member';

const validDraft: MemberDraft = {
  name: 'Anna',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  snackKcal: 0,
};

describe('allowedGoals', () => {
  it('lets adults pick any goal', () => {
    expect(allowedGoals(18)).toEqual(['lose', 'maintain', 'gain']);
    expect(allowedGoals(45)).toEqual(['lose', 'maintain', 'gain']);
  });

  it('limits children and teenagers to keeping their weight', () => {
    expect(allowedGoals(7)).toEqual(['maintain']);
    expect(allowedGoals(17)).toEqual(['maintain']);
  });

  it('treats an unknown age like an adult', () => {
    expect(allowedGoals(Number.NaN)).toHaveLength(3);
  });
});

describe('validateMember', () => {
  it('accepts a complete, sensible draft', () => {
    expect(validateMember(validDraft)).toEqual({});
  });

  it('asks for a name and ignores surrounding whitespace', () => {
    expect(validateMember({ ...validDraft, name: '   ' })).toEqual({ name: 'required' });
    expect(validateMember({ ...validDraft, name: '  Anna  ' })).toEqual({});
  });

  it('rejects names longer than the limit', () => {
    expect(validateMember({ ...validDraft, name: 'a'.repeat(41) })).toEqual({ name: 'invalid' });
    expect(validateMember({ ...validDraft, name: 'a'.repeat(40) })).toEqual({});
  });

  it('reports every missing number', () => {
    const empty = {
      name: 'Anna',
      age: Number.NaN,
      heightCm: Number.NaN,
      weightKg: Number.NaN,
      snackKcal: Number.NaN,
    };

    expect(validateMember(empty)).toEqual({
      age: 'required',
      heightCm: 'required',
      weightKg: 'required',
      snackKcal: 'required',
    });
  });

  it.each([
    ['age', { age: 0 }],
    ['age', { age: 121 }],
    ['age', { age: 30.5 }],
    ['heightCm', { heightCm: 49 }],
    ['heightCm', { heightCm: 251 }],
    ['weightKg', { weightKg: 9 }],
    ['weightKg', { weightKg: 301 }],
    ['weightKg', { weightKg: Number.POSITIVE_INFINITY }],
    ['snackKcal', { snackKcal: -1 }],
    ['snackKcal', { snackKcal: 1001 }],
    ['snackKcal', { snackKcal: 150.5 }],
  ] as const)('rejects an out-of-range %s', (field, override) => {
    expect(validateMember({ ...validDraft, ...override })).toEqual({ [field]: 'invalid' });
  });

  it('accepts values on the boundaries', () => {
    expect(validateMember({ name: 'A', age: 1, heightCm: 50, weightKg: 10, snackKcal: 0 })).toEqual(
      {},
    );
    expect(
      validateMember({ name: 'A', age: 120, heightCm: 250, weightKg: 300, snackKcal: 1000 }),
    ).toEqual({});
  });

  it('accepts a fractional weight', () => {
    expect(validateMember({ ...validDraft, weightKg: 72.5 })).toEqual({});
  });
});

describe('validateMember: target weight', () => {
  it('is optional', () => {
    expect(validateMember({ ...validDraft, goal: 'lose' })).toEqual({});
    expect(validateMember({ ...validDraft, goal: 'gain' })).toEqual({});
  });

  it('must be below the current weight to lose weight', () => {
    expect(validateMember({ ...validDraft, goal: 'lose', targetWeightKg: 55 })).toEqual({});
    expect(validateMember({ ...validDraft, goal: 'lose', targetWeightKg: 60 })).toEqual({
      targetWeightKg: 'invalid',
    });
    expect(validateMember({ ...validDraft, goal: 'lose', targetWeightKg: 65 })).toEqual({
      targetWeightKg: 'invalid',
    });
  });

  it('must be above the current weight to gain weight', () => {
    expect(validateMember({ ...validDraft, goal: 'gain', targetWeightKg: 65 })).toEqual({});
    expect(validateMember({ ...validDraft, goal: 'gain', targetWeightKg: 60 })).toEqual({
      targetWeightKg: 'invalid',
    });
    expect(validateMember({ ...validDraft, goal: 'gain', targetWeightKg: 50 })).toEqual({
      targetWeightKg: 'invalid',
    });
  });

  it('means nothing when keeping weight, whatever it says', () => {
    expect(validateMember({ ...validDraft, goal: 'maintain', targetWeightKg: 500 })).toEqual({});
    expect(validateMember({ ...validDraft, targetWeightKg: 500 })).toEqual({});
  });

  it('must be a possible weight', () => {
    expect(
      validateMember({ ...validDraft, weightKg: 100, goal: 'lose', targetWeightKg: 9 }),
    ).toEqual({ targetWeightKg: 'invalid' });
    expect(
      validateMember({ ...validDraft, weightKg: 100, goal: 'lose', targetWeightKg: Number.NaN }),
    ).toEqual({ targetWeightKg: 'invalid' });
  });

  it('is not compared with a current weight that is not readable yet', () => {
    expect(
      validateMember({ ...validDraft, weightKg: Number.NaN, goal: 'lose', targetWeightKg: 55 }),
    ).toEqual({ weightKg: 'required' });
  });
});
