/** Energy and macronutrients. Grams for macros, kilocalories for energy. */
export interface Nutrients {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export const NO_NUTRIENTS: Nutrients = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    proteinG: a.proteinG + b.proteinG,
    fatG: a.fatG + b.fatG,
    carbsG: a.carbsG + b.carbsG,
  };
}

export function scaleNutrients(nutrients: Nutrients, factor: number): Nutrients {
  return {
    kcal: nutrients.kcal * factor,
    proteinG: nutrients.proteinG * factor,
    fatG: nutrients.fatG * factor,
    carbsG: nutrients.carbsG * factor,
  };
}
