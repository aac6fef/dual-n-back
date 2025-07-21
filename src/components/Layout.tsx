import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Settings, History } from "lucide-react";
import "./Layout.css";

const getLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

const Layout = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>{t('nav.title')}</h2>
        </div>
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={getLinkClass}>
              <Home size={20} />
              <span>{t('nav.game')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={getLinkClass}>
              <Settings size={20} />
              <span>{t('nav.settings')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/history" className={getLinkClass}>
              <History size={20} />
              <span>{t('nav.history')}</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      <main className="content fade-in" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
