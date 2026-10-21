import { BookOpen, CalendarDays, Settings, ShoppingCart, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ROUTES = {
  calendar: '/kalendarz',
  shopping: '/zakupy',
  recipes: '/przepisy',
  household: '/domownicy',
  settings: '/ustawienia',
} as const;

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: ROUTES.calendar, label: 'Kalendarz', icon: CalendarDays },
  { path: ROUTES.shopping, label: 'Zakupy', icon: ShoppingCart },
  { path: ROUTES.recipes, label: 'Przepisy', icon: BookOpen },
  { path: ROUTES.household, label: 'Domownicy', icon: Users },
  { path: ROUTES.settings, label: 'Ustawienia', icon: Settings },
];
