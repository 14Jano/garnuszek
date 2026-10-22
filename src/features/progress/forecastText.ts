import type { Forecast } from '../../domain/progress/progress';
import { formatLongDate } from '../../domain/plan/dates';
import { formatChange } from '../../format/numbers';

/** The forecast of reaching a target weight, said in a sentence. */
export function forecastText(forecast: Forecast): string {
  switch (forecast.status) {
    case 'reached':
      return 'Cel osiągnięty. Gratulacje!';
    case 'projected':
      return `Jeśli tempo się utrzyma (${formatChange(forecast.changePerWeek)} kg na tydzień), cel osiągniesz około ${formatLongDate(forecast.date)}.`;
    case 'too-far':
      return 'Przy obecnym tempie cel jest dalej niż za dwa lata, więc nie podajemy daty.';
    case 'not-approaching':
      return 'W ostatnich tygodniach waga nie zbliża się do celu, więc nie podajemy prognozy.';
    case 'not-enough-data':
      return 'Do prognozy potrzebne są co najmniej dwa pomiary w odstępie tygodnia, z ostatnich ośmiu tygodni.';
  }
}
