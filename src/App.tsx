import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Settings, History } from "lucide-react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import "./App.css";
import GamePage from "./pages/GamePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";

const Layout = () => {
  const { t } = useTranslation();
  const [theme] = useLocalStorage('settings:theme', 'dark');

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<GamePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
