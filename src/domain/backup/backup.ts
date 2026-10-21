import { MEMBER_LIMITS, allowedGoals, validateMember } from '../household/member';
import type { Member } from '../household/member';
import { ACTIVITY_LEVELS, GOALS, SEXES } from '../nutrition/calorieTarget';
import { isDateKey, startOfWeek } from '../plan/dates';
import type { DateKey } from '../plan/dates';
import { planEntryKey } from '../plan/planEntry';
import type { PlanEntry } from '../plan/planEntry';
import type { SnackOverride } from '../plan/snacks';
import type { IngredientCatalog } from '../recipes/ingredient';
import { MEAL_TYPES, hasRecipeErrors, validateRecipe } from '../recipes/recipe';
import type { Recipe } from '../recipes/recipe';

/** Identifies a file as a Garnuszek backup, whatever it is called. */
export const BACKUP_FORMAT = 'garnuszek-backup';

/**
 * Version of the file layout, not of the database. Raise it when the layout
 * changes in a way an older version of the app could not read.
 */
export const BACKUP_VERSION = 1;

/** An item of a week's shopping list that was ticked off. */
export interface ShoppingCheck {
  /** Monday of the week. */
  weekStart: DateKey;
  ingredientId: string;
}

/** Everything the user has entered. Built-in recipes and ingredients ship with the app. */
export interface BackupData {
  members: Member[];
  customRecipes: Recipe[];
  favoriteRecipeIds: string[];
  planEntries: PlanEntry[];
  shoppingChecks: ShoppingCheck[];
  snackOverrides: SnackOverride[];
}

export interface Backup extends BackupData {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** When the file was made, as an ISO 8601 timestamp. */
  exportedAt: string;
}

export function createBackup(data: BackupData, now: Date = new Date()): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    ...data,
  };
}

/** What is already known about the app that reads the backup. */
export interface BackupContext {
  catalog: IngredientCatalog;
  /** Ids of the recipes that ship with the app. */
  builtInRecipeIds: ReadonlySet<string>;
}

/** Why a file could not be read. */
export type BackupProblem =
  /** The text is not JSON at all. */
  | 'not-json'
  /** It is JSON, but not a Garnuszek backup. */
  | 'not-a-backup'
  /** It was made by a newer version of the app, which this one cannot read safely. */
  | 'newer-version'
  /** It is a backup, but some of its data is damaged or out of range. */
  | 'invalid-data';

/** Items that were left out because they pointed at something that no longer exists. */
export interface DroppedItems {
  planEntries: number;
  favorites: number;
  shoppingChecks: number;
  snackOverrides: number;
}

export type BackupParseResult =
  | { ok: true; backup: Backup; dropped: DroppedItems }
  | {
      ok: false;
      problem: BackupProblem;
      /** For `invalid-data`: where in the file the first problem is, e.g. `members[1].age`. */
      detail?: string;
    };

/**
 * Reads and checks a backup file. The file is untrusted: the user may have
 * edited it, or picked a different file by mistake, and bad data would later
 * break screens. So its own data (members, recipes, plan) is checked strictly
 * and a single problem rejects the whole file, while references to things that
 * no longer exist (a built-in recipe that was removed, say) are dropped and
 * counted.
 */
export function parseBackup(text: string, context: BackupContext): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'not-json' };
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    return { ok: false, problem: 'not-a-backup' };
  }
  if (
    typeof parsed.version !== 'number' ||
    !Number.isInteger(parsed.version) ||
    parsed.version < 1
  ) {
    return { ok: false, problem: 'not-a-backup' };
  }
  if (parsed.version > BACKUP_VERSION) {
    return { ok: false, problem: 'newer-version' };
  }

  try {
    return readBackup(parsed, context);
  } catch (error) {
    if (error instanceof InvalidBackupData) {
      return { ok: false, problem: 'invalid-data', detail: error.path };
    }
    throw error;
  }
}

function readBackup(root: Record<string, unknown>, context: BackupContext): BackupParseResult {
  const exportedAt = readText(root.exportedAt, 'exportedAt');
  if (Number.isNaN(Date.parse(exportedAt))) fail('exportedAt');

  const members = readList(root.members, 'members', (item, path) => readMember(item, path));
  assertUnique(
    members.map((member) => member.id),
    'members',
  );
  const memberIds = new Set(members.map((member) => member.id));

  const customRecipes = readList(root.customRecipes, 'customRecipes', (item, path) =>
    readRecipe(item, path, context.catalog),
  );
  assertUnique(
    customRecipes.map((recipe) => recipe.id),
    'customRecipes',
  );
  for (const [index, recipe] of customRecipes.entries()) {
    // A custom recipe must not take the place of a built-in one.
    if (context.builtInRecipeIds.has(recipe.id)) fail(`customRecipes[${index}].id`);
  }
  const recipeIds = new Set([...context.builtInRecipeIds, ...customRecipes.map((r) => r.id)]);

  const favorites = readList(root.favoriteRecipeIds, 'favoriteRecipeIds', (item, path) =>
    readText(item, path),
  );
  const planEntries = readList(root.planEntries, 'planEntries', (item, path) =>
    readPlanEntry(item, path),
  );
  const shoppingChecks = readList(root.shoppingChecks, 'shoppingChecks', (item, path) =>
    readShoppingCheck(item, path),
  );
  const snackOverrides = readList(root.snackOverrides, 'snackOverrides', (item, path) =>
    readSnackOverride(item, path),
  );

  const keptFavorites = unique(favorites.filter((id) => recipeIds.has(id)));
  const keptPlan = lastWins(
    planEntries
      .filter((entry) => recipeIds.has(entry.recipeId))
      .map((entry) => ({
        ...entry,
        memberIds: entry.memberIds.filter((id) => memberIds.has(id)),
      })),
    (entry) => planEntryKey(entry.date, entry.mealType),
  );
  const keptChecks = lastWins(
    shoppingChecks
      .filter((check) => context.catalog.has(check.ingredientId))
      .map((check) => ({ ...check, weekStart: startOfWeek(check.weekStart) })),
    (check) => `${check.weekStart}_${check.ingredientId}`,
  );
  const keptSnacks = lastWins(
    snackOverrides.filter((override) => memberIds.has(override.memberId)),
    (override) => `${override.date}_${override.memberId}`,
  );

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      members,
      customRecipes,
      favoriteRecipeIds: keptFavorites,
      planEntries: keptPlan,
      shoppingChecks: keptChecks,
      snackOverrides: keptSnacks,
    },
    dropped: {
      planEntries: planEntries.filter((entry) => !recipeIds.has(entry.recipeId)).length,
      favorites: favorites.length - keptFavorites.length,
      shoppingChecks: shoppingChecks.length - keptChecks.length,
      snackOverrides: snackOverrides.length - keptSnacks.length,
    },
  };
}

function readMember(raw: unknown, path: string): Member {
  const item = readRecord(raw, path);
  const member: Member = {
    id: readId(item.id, `${path}.id`),
    name: readText(item.name, `${path}.name`).trim(),
    sex: readOneOf(item.sex, SEXES, `${path}.sex`),
    age: readNumber(item.age, `${path}.age`),
    heightCm: readNumber(item.heightCm, `${path}.heightCm`),
    weightKg: readNumber(item.weightKg, `${path}.weightKg`),
    activity: readOneOf(item.activity, ACTIVITY_LEVELS, `${path}.activity`),
    goal: readOneOf(item.goal, GOALS, `${path}.goal`),
    snackKcal: readNumber(item.snackKcal, `${path}.snackKcal`),
  };

  // The same rules as the form, so a restored member is one the form could have saved.
  const problem = Object.keys(validateMember(member))[0];
  if (problem) fail(`${path}.${problem}`);
  if (!allowedGoals(member.age).includes(member.goal)) fail(`${path}.goal`);

  return member;
}

function readRecipe(raw: unknown, path: string, catalog: IngredientCatalog): Recipe {
  const item = readRecord(raw, path);
  const recipe: Recipe = {
    id: readId(item.id, `${path}.id`),
    name: readText(item.name, `${path}.name`).trim(),
    mealType: readOneOf(item.mealType, MEAL_TYPES, `${path}.mealType`),
    servings: readNumber(item.servings, `${path}.servings`),
    prepMinutes: readNumber(item.prepMinutes, `${path}.prepMinutes`),
    ingredients: readList(item.ingredients, `${path}.ingredients`, (ingredient, ingredientPath) => {
      const line = readRecord(ingredient, ingredientPath);
      return {
        ingredientId: readText(line.ingredientId, `${ingredientPath}.ingredientId`),
        grams: readNumber(line.grams, `${ingredientPath}.grams`),
      };
    }),
    steps: readList(item.steps, `${path}.steps`, (step, stepPath) => readText(step, stepPath)),
  };

  // The same rules as the form, including that every ingredient exists in the catalog.
  if (hasRecipeErrors(validateRecipe(recipe, catalog))) fail(path);

  return recipe;
}

function readPlanEntry(raw: unknown, path: string): PlanEntry {
  const item = readRecord(raw, path);
  const entry: PlanEntry = {
    date: readDateKey(item.date, `${path}.date`),
    mealType: readOneOf(item.mealType, MEAL_TYPES, `${path}.mealType`),
    recipeId: readId(item.recipeId, `${path}.recipeId`),
    memberIds: readList(item.memberIds, `${path}.memberIds`, (id, idPath) => readText(id, idPath)),
  };

  return {
    ...entry,
    ...(item.batchId === undefined ? {} : { batchId: readId(item.batchId, `${path}.batchId`) }),
    ...(item.cookedOn === undefined
      ? {}
      : { cookedOn: readDateKey(item.cookedOn, `${path}.cookedOn`) }),
  };
}

function readShoppingCheck(raw: unknown, path: string): ShoppingCheck {
  const item = readRecord(raw, path);
  return {
    weekStart: readDateKey(item.weekStart, `${path}.weekStart`),
    ingredientId: readText(item.ingredientId, `${path}.ingredientId`),
  };
}

function readSnackOverride(raw: unknown, path: string): SnackOverride {
  const item = readRecord(raw, path);
  const kcal = readNumber(item.kcal, `${path}.kcal`);
  const { min, max } = MEMBER_LIMITS.snackKcal;
  if (!Number.isInteger(kcal) || kcal < min || kcal > max) fail(`${path}.kcal`);

  return {
    date: readDateKey(item.date, `${path}.date`),
    memberId: readId(item.memberId, `${path}.memberId`),
    kcal,
  };
}

/** Raised, and caught in `parseBackup`, to stop reading at the first damaged value. */
class InvalidBackupData extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`Invalid backup data at ${path}`);
    this.path = path;
  }
}

function fail(path: string): never {
  throw new InvalidBackupData(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  return isRecord(value) ? value : fail(path);
}

function readText(value: unknown, path: string): string {
  return typeof value === 'string' ? value : fail(path);
}

function readId(value: unknown, path: string): string {
  const id = readText(value, path);
  return id.trim() === '' ? fail(path) : id;
}

function readNumber(value: unknown, path: string): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fail(path);
}

function readOneOf<T extends string>(value: unknown, options: readonly T[], path: string): T {
  return options.find((option) => option === value) ?? fail(path);
}

function readDateKey(value: unknown, path: string): DateKey {
  const key = readText(value, path);
  return isDateKey(key) ? key : fail(path);
}

function readList<T>(
  value: unknown,
  path: string,
  readItem: (item: unknown, itemPath: string) => T,
): T[] {
  if (!Array.isArray(value)) return fail(path);
  return value.map((item, index) => readItem(item, `${path}[${index}]`));
}

function assertUnique(ids: readonly string[], path: string): void {
  if (new Set(ids).size !== ids.length) fail(path);
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** Keeps one item per key; when a key repeats, the later item wins. */
function lastWins<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [keyOf(item), item])).values()];
}
