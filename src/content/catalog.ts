import { createCatalog } from '../domain/recipes/ingredient';
import { INGREDIENTS } from './ingredients';

export const INGREDIENT_CATALOG = createCatalog(INGREDIENTS);
