import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Settings, History } from "lucide-react";
import { SettingsProvider } from "./contexts/SettingsContext";
import "./App.css";
import GamePage from "./pages/GamePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";

const Layout = () => {
  const { t } = useTranslation();

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : "";

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
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

const GlobalSVGDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'var(--color-accent)', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
  </svg>
);

function App() {
  return (
    <SettingsProvider>
      <GlobalSVGDefs />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<GamePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </SettingsProvider>
  );
}

export default App;
