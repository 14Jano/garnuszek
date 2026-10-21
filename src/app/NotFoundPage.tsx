import { Link } from 'react-router-dom';
import { ROUTES } from './navigation';

export function NotFoundPage() {
  return (
    <section>
      <h1>Nie ma takiej strony</h1>
      <p>Sprawdź adres albo wróć do kalendarza posiłków.</p>
      <p>
        <Link to={ROUTES.calendar}>Przejdź do kalendarza</Link>
      </p>
    </section>
  );
}
