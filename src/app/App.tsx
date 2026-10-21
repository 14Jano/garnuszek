import { Navigate, Route, Routes } from 'react-router-dom';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { RecipePickerPage } from '../features/calendar/RecipePickerPage';
import { HouseholdPage } from '../features/household/HouseholdPage';
import { RecipeDetailPage } from '../features/recipes/RecipeDetailPage';
import { RecipeFormPage } from '../features/recipes/RecipeFormPage';
import { RecipesPage } from '../features/recipes/RecipesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ShoppingListPage } from '../features/shopping/ShoppingListPage';
import { AppLayout } from './AppLayout';
import { NotFoundPage } from './NotFoundPage';
import { ROUTES, recipePath } from './navigation';

/**
 * Route table only. The router itself is provided by the caller, which lets
 * tests use MemoryRouter and the browser build use HashRouter.
 */
export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={ROUTES.calendar} replace />} />
        <Route path={ROUTES.calendar} element={<CalendarPage />} />
        <Route path={`${ROUTES.calendar}/:date`} element={<CalendarPage />} />
        <Route path={`${ROUTES.calendar}/:date/:mealType/wybierz`} element={<RecipePickerPage />} />
        <Route path={ROUTES.shopping} element={<ShoppingListPage />} />
        <Route path={ROUTES.recipes} element={<RecipesPage />} />
        <Route path={recipePath.create} element={<RecipeFormPage />} />
        <Route path={`${ROUTES.recipes}/:recipeId`} element={<RecipeDetailPage />} />
        <Route path={`${ROUTES.recipes}/:recipeId/edytuj`} element={<RecipeFormPage />} />
        <Route path={ROUTES.household} element={<HouseholdPage />} />
        <Route path={ROUTES.settings} element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
