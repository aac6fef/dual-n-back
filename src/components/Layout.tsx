import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useGameStatus } from "../contexts/GameStatusContext";
import { usePause } from "../contexts/PauseContext";
import { Home, Settings, History } from "lucide-react";
import "./Layout.css";

const getLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

const Layout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isGameRunning, setIsGameRunning } = useGameStatus();
  const { requestPause } = usePause();

  const handleNavigate = async (e: React.MouseEvent, path: string) => {
    if (isGameRunning && location.pathname === '/') {
      e.preventDefault();
      requestPause(); // Request to pause the game
      const confirmed = await confirm(t('game.quitConfirmation'), {
        title: t('game.quitTitle'),
        okLabel: t('game.quitAndLeave'),
        cancelLabel: t('game.stayOnPage')
      });

      if (confirmed) {
        setIsGameRunning(false);
        navigate(path);
      }
    }
  };

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>{t('nav.title')}</h2>
        </div>
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={getLinkClass} onClick={(e) => handleNavigate(e, '/')}>
              <Home size={20} />
              <span>{t('nav.game')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={getLinkClass} onClick={(e) => handleNavigate(e, '/settings')}>
              <Settings size={20} />
              <span>{t('nav.settings')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/history" className={getLinkClass} onClick={(e) => handleNavigate(e, '/history')}>
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
