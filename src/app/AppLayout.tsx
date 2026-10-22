import { useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { NAV_ITEMS } from './navigation';
import { usePageHeading, viewOf } from './usePageHeading';
import './AppLayout.css';

export function AppLayout() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  usePageHeading(main, viewOf(pathname));

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

      <main id="content" ref={main} className="app-main">
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
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
