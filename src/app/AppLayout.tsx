import { NavLink, Outlet } from 'react-router-dom';
import { NAV_ITEMS } from './navigation';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="app-layout">
      <a className="skip-link" href="#content">
        Przejdź do treści
      </a>

      <header className="app-header">
        <img
          className="app-header__logo"
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          width={32}
          height={32}
        />
        <span className="app-header__name">Garnuszek</span>
      </header>

      <main id="content" className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Główna nawigacja">
        <ul className="bottom-nav__list">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <li key={path} className="bottom-nav__item">
              <NavLink to={path} className="bottom-nav__link">
                <Icon aria-hidden="true" size={22} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
